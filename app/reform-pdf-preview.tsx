'use client';
import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentLoadingTask} from 'pdfjs-dist';

/** Render every page explicitly; mobile native PDF frames often expose only page one. */
export function ReformPdfPreview({url}:{url:string}) {
 const pages=useRef<HTMLDivElement>(null);
 const [status,setStatus]=useState('Memuatkan halaman PDF…');
 useEffect(()=>{
  const container=pages.current;
  if(!container)return;
  let stopped=false;
  let task:PDFDocumentLoadingTask|undefined;
  const controller=new AbortController();
  container.replaceChildren();
  setStatus('Memuatkan halaman PDF…');
  void (async()=>{
   try {
    const modulePath=new URL('/pdfjs/pdf.mjs',window.location.href).href;
    const {getDocument,GlobalWorkerOptions}=await import(/* @vite-ignore */ modulePath) as typeof import('pdfjs-dist');
    if(stopped)return;
    GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw new Error('PDF tidak dapat dimuatkan.');
    const data=new Uint8Array(await response.arrayBuffer());
    if(stopped)return;
    task=getDocument({data,isEvalSupported:false,useSystemFonts:true});
    const document=await task.promise;
    for(let number=1;number<=document.numPages;number++){
     if(stopped)return;
     const page=await document.getPage(number);
     if(stopped)return;
     const viewport=page.getViewport({scale:1.5});
     const figure=documentElement('figure');
     const caption=documentElement('figcaption');
     caption.textContent=`Halaman ${number} daripada ${document.numPages}`;
     const canvas=window.document.createElement('canvas');
     canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Halaman ${number} laporan Immediate Reform`);
     const context=canvas.getContext('2d');
     if(!context)throw new Error('Pratonton tidak tersedia.');
     await page.render({canvas,canvasContext:context,viewport}).promise;
     if(stopped)return;
     figure.append(caption,canvas);container.append(figure);page.cleanup();
     setStatus(number===document.numPages?`${document.numPages} halaman · Tatal ke bawah untuk melihat keseluruhan laporan.`:`Memuatkan halaman ${number} daripada ${document.numPages}…`);
    }
   }catch{if(!stopped)setStatus('Pratonton tidak dapat dimuatkan sepenuhnya. Gunakan pautan Buka PDF dalam tab baharu di bawah.');}
  })();
  return()=>{stopped=true;controller.abort();void task?.destroy();container.replaceChildren();};
 },[url]);
 return <div className="reform-pdf-pages"><p role="status">{status}</p><div ref={pages}/></div>;
}
function documentElement<K extends keyof HTMLElementTagNameMap>(tag:K){return window.document.createElement(tag);}
