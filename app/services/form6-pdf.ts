import type {Form6Teacher} from '../form6-model';
export async function readForm6AscPdf(bytes:Uint8Array):Promise<{teachers:Form6Teacher[];pageCount:number}|null>{
 const pdfModule='/pdfjs/pdf.mjs',parserModule='/ekeberadaan-app/form6-asc.js';
 const {getDocument,GlobalWorkerOptions,OPS}=await import(/* @vite-ignore */ pdfModule);
 GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
 const document=await getDocument({data:bytes.slice(),disableFontFace:true,isEvalSupported:false}).promise;
 try{
  const page=await document.getPage(1),text=await page.getTextContent();
  const isAsc=text.items.some((i:{str?:string})=>i.str?.includes('aSc'))&&text.items.some((i:{str?:string})=>/^Guru\s/.test(i.str||''));page.cleanup();
  if(!isAsc)return null;
  const {extractForm6Asc}=await import(/* @vite-ignore */ parserModule);
  return await extractForm6Asc(document,OPS);
 }finally{await document.destroy();}
}
