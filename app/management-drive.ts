export async function managementDrive(payload:Record<string,unknown>){
 const endpoint=process.env.OPR_APPS_SCRIPT_URL,token=process.env.OPR_APPS_SCRIPT_TOKEN;
 if(!endpoint||!token)throw new Error('Sambungan Drive sekolah belum tersedia.');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,token}),redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(45000)});
 const data=await response.json() as {ok?:boolean;id?:string;url?:string;base64?:string;name?:string;mimeType?:string;service?:string};
 if(!response.ok||!data.ok)throw new Error('Drive sekolah belum dapat memproses fail. Cuba semula; jangan tutup borang.');
 return data;
}
export function encodeDriveBytes(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer);let binary='';
 for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(binary);
}
