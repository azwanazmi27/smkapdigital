export type Booking = { id: string; room: string; applicantName: string; purpose: string; startDate: string; startTime: string; endDate: string; endTime: string; participants: number; status: string; canDelete?: boolean; pending?: boolean };
type Query = { from: string; to: string; rows: Booking[]; checkedAt: string; refreshing: boolean; error: string; invalidated?: boolean };
type Change = { id: string; row: Booking; deleting: boolean };
type Snapshot = { queries: Record<string, Query>; changes: Change[]; message: string; failed: boolean };
export const bookingRangeKey = (from: string, to: string) => `${from}/${to}`;
const overlaps = (row: Booking, from: string, to: string) => row.endDate >= from && row.startDate <= to;
export function bookingQuery(snapshot: Snapshot, from: string, to: string): Query | undefined {
  const exact=snapshot.queries[bookingRangeKey(from,to)];
  const covering=Object.values(snapshot.queries).filter(q=>q.from<=from&&q.to>=to&&q.checkedAt).sort((a,b)=>b.checkedAt.localeCompare(a.checkedAt))[0];
  return exact?.checkedAt && (!covering || exact.checkedAt>=covering.checkedAt) ? exact : covering || exact;
}
export function bookingRows(snapshot: Snapshot, from: string, to: string): Booking[] {
  const rows = new Map((bookingQuery(snapshot,from,to)?.rows || []).filter(row=>overlaps(row,from,to)).map(row => [row.id,row]));
  for (const change of snapshot.changes) {
    rows.delete(change.id);
    if (overlaps(change.row,from,to)) rows.set(change.id,{...change.row,pending:true,canDelete:false,status:change.deleting ? "Sedang dipadam" : "Sedang disahkan"});
  }
  return [...rows.values()].filter(row=>row.status!=="Dibatalkan").sort((a,b) => `${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
}

// Memory only, scoped to the signed-in account. Pending requests continue when
// the sheet closes; reopening observes the same state instead of sending twice.
export function createBookingClient(fetcher: typeof fetch = fetch) {
  let snapshot: Snapshot = {queries:{},changes:[],message:"",failed:false};
  let generation = 0;
  const listeners = new Set<() => void>();
  const reads = new Map<string,Promise<void>>();
  const emit = (next: Snapshot) => { snapshot=next; listeners.forEach(fn=>fn()); };
  const setQuery = (key: string, query: Query) => emit({...snapshot,queries:{...snapshot.queries,[key]:query}});
  const refresh = (from: string,to: string,force=false): Promise<void> => {
    const key=bookingRangeKey(from,to), cached=bookingQuery(snapshot,from,to);
    if (reads.has(key)) return reads.get(key)!;
    for (const [activeKey,task] of reads) { const q=snapshot.queries[activeKey]; if (q.from<=from&&q.to>=to) return task; }
    if (!force && cached && !cached.invalidated && Date.now()-Date.parse(cached.checkedAt)<15000) return Promise.resolve();
    const version=generation;
    setQuery(key,{from,to,rows:(cached?.rows||[]).filter(row=>overlaps(row,from,to)),checkedAt:cached?.checkedAt||"",refreshing:true,error:""});
    const task=(async()=>{
      try {
        const query=from===to ? `date=${encodeURIComponent(from)}` : `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const response=await fetcher(`/api/etempahan?${query}`,{cache:"no-store",signal:AbortSignal.timeout(30000)});
        const data=await response.json() as {bookings?:Booking[];checkedAt?:string;error?:string};
        if (!response.ok) throw new Error(data.error||"Senarai belum dapat disegarkan. Cuba semula.");
        if (version===generation) setQuery(key,{from,to,rows:data.bookings||[],checkedAt:data.checkedAt||new Date().toISOString(),refreshing:false,error:""});
      } catch (error) {
        setQuery(key,{...snapshot.queries[key],refreshing:false,error:error instanceof Error?error.message:"Sambungan terputus. Cuba semula."});
      } finally {
        reads.delete(key);
        if (snapshot.queries[key]?.refreshing) setQuery(key,{...snapshot.queries[key],refreshing:false});
      }
    })();
    reads.set(key,task);
    return task;
  };
  const mutate=async(method:"POST"|"DELETE",payload:Record<string,unknown>,row:Booking) => {
    if (snapshot.changes.some(change=>change.id===row.id || (method==="POST" && !change.deleting))) throw new Error("Perubahan rekod ini masih sedang disahkan.");
    generation++;
    if (!bookingQuery(snapshot,row.startDate,row.startDate)) setQuery(bookingRangeKey(row.startDate,row.startDate),{from:row.startDate,to:row.startDate,rows:[],checkedAt:"",refreshing:false,error:""});
    emit({...snapshot,changes:[...snapshot.changes,{id:row.id,row,deleting:method==="DELETE"}],message:"",failed:false});
    try {
      const response=await fetcher("/api/etempahan",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true});
      let data: {success?:boolean;id?:string;booking?:Booking;error?:string;emailSent?:boolean};
      try {data=await response.json();}
      catch {throw new Error("Sambungan terganggu selepas penghantaran. Semak senarai sebelum mencuba semula supaya tidak berganda.");}
      if (!response.ok||!data.success) throw new Error(data.error||"Perubahan belum dapat disahkan. Semak senarai sebelum mencuba semula.");
      generation++;
      const saved=data.booking || {...row,id:data.id||row.id,status:"Diluluskan",pending:false};
      const queries=Object.fromEntries(Object.entries(snapshot.queries).map(([key,q])=>[key,{...q,rows:[...q.rows.filter(item=>item.id!==row.id && item.id!==saved.id),...(method!=="DELETE"&&overlaps(saved,q.from,q.to)?[saved]:[])],invalidated:true,error:""}]));
      emit({...snapshot,queries,changes:snapshot.changes.filter(change=>change.id!==row.id),message:method==="DELETE"?"Tempahan berjaya dipadam.":`Tempahan berjaya diluluskan.${data.emailSent===false?" E-mel pengesahan belum dapat dihantar.":""}`,failed:false});
      return saved;
    } catch (error) {
      generation++;
      emit({...snapshot,changes:snapshot.changes.filter(change=>change.id!==row.id),message:error instanceof Error?error.message:"Perubahan belum dapat disahkan.",failed:true});
      // Refresh is read-only: never retry a write automatically after a network error.
      for (const query of Object.values(snapshot.queries)) if (overlaps(row,query.from,query.to)) void refresh(query.from,query.to,true);
      throw error;
    }
  };
  return {getSnapshot:()=>snapshot,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},refresh,mutate};
}
const clients=new Map<string,ReturnType<typeof createBookingClient>>();
export function bookingClientFor(account:string) {
  let client=clients.get(account);
  if (!client) {client=createBookingClient();clients.set(account,client);}
  return client;
}
export function clearBookingClients() { clients.clear(); }
