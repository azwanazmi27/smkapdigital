export type PcgItem={id:string;item:string;quantity:number;unitCents:number;date:string;purpose:string;status:'planned'|'paid'|'cancelled';reference:string};
export type PcgLedger={id:string;revision:number;allocationCents:number;components:{name:string;percent:number}[];items:PcgItem[]};
export const emptyLedger=(id:string):PcgLedger=>({id,revision:0,allocationCents:0,components:[],items:[]});
export function moneyCents(value:string){if(!/^\d+(\.\d{1,2})?$/.test(value.trim()))throw new Error('Masukkan amaun RM yang sah, maksimum dua tempat perpuluhan.');const cents=Math.round(Number(value)*100);if(!Number.isSafeInteger(cents)||cents>100000000)throw new Error('Amaun terlalu besar.');return cents;}
export function pcgTotals(ledger:PcgLedger){const sum=(status:PcgItem['status'])=>ledger.items.filter(i=>i.status===status).reduce((n,i)=>n+i.quantity*i.unitCents,0);const paid=sum('paid'),planned=sum('planned');return {paid,planned,balance:ledger.allocationCents-paid,available:ledger.allocationCents-paid-planned,percent:ledger.components.reduce((n,c)=>n+c.percent,0)};}
export function validateLedger(l:PcgLedger){
 if(!Number.isSafeInteger(l.allocationCents)||l.allocationCents<0)throw new Error('Peruntukan tidak sah.');
 if(l.components.some(c=>!c.name.trim()||!Number.isFinite(c.percent)||c.percent<0||c.percent>100)||pcgTotals(l).percent>100.000001)throw new Error('Isi nama komponen dan pastikan jumlah agihan tidak melebihi 100%.');
 if(l.items.some(i=>!i.item.trim()||!i.date||!i.purpose.trim()||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>100000||!Number.isSafeInteger(i.unitCents)||i.unitCents<0||!Number.isSafeInteger(i.unitCents*i.quantity)||!['planned','paid','cancelled'].includes(i.status)||(i.status==='paid'&&!i.reference.trim())))throw new Error('Lengkapkan butiran item. Belanja sebenar memerlukan rujukan resit atau invois.');
}
export const pcgMoney=(cents:number)=>'RM '+(cents/100).toLocaleString('ms-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
