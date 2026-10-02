type PdfConstructor=(typeof import('jspdf'))['jsPDF'];
let pending:Promise<PdfConstructor>|undefined;
// A retained, versioned asset survives application deployments. Do not remove old versions.
export function loadJsPdf():Promise<PdfConstructor>{
 if(typeof window==='undefined')return Promise.reject(new Error('Pratonton PDF hanya boleh dibuka dalam pelayar.'));
 const runtime=window as Window&{jspdf?:{jsPDF:PdfConstructor}};
 if(runtime.jspdf?.jsPDF)return Promise.resolve(runtime.jspdf.jsPDF);
 if(pending)return pending;
 pending=new Promise<PdfConstructor>((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=window.setTimeout(()=>fail(),30000);
  const fail=()=>{window.clearTimeout(timer);script.remove();pending=undefined;reject(new Error('Fail PDF belum dapat dimuatkan. Semak sambungan internet dan tekan Pratonton sekali lagi. Maklumat borang masih dikekalkan.'));};
  script.src='/vendor/jspdf-4.2.1.umd.min.js';script.async=true;
  script.onerror=fail;
  script.onload=()=>{window.clearTimeout(timer);if(runtime.jspdf?.jsPDF)resolve(runtime.jspdf.jsPDF);else fail();};
  document.head.appendChild(script);
 });
 return pending;
}
