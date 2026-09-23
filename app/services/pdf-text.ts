export async function extractPdfPages(bytes: Uint8Array): Promise<string[]> {
  // Load in the browser only: PDF.js requires DOMMatrix, unavailable in Workers.
  const browserModule = '/pdfjs/pdf.mjs';
  const {getDocument, GlobalWorkerOptions} = await import(/* @vite-ignore */ browserModule);
  GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs';
  const document = await getDocument({data: bytes.slice(), disableFontFace: true, isEvalSupported: false, useSystemFonts: true}).promise;
  try {
    if (document.numPages > 30) throw new Error('PDF_TOO_MANY_PAGES');
    const pages: string[] = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str + (item.hasEOL ? '\n' : ' ');
      }
      pages.push(text.replace(/[ \t]+/g, ' ').replace(/(?<!\d)(\d\s*\d)\s*\.\s*(\d\s*\d)\s*\.\s*(\d\s*\d\s*\d\s*\d)(?!\d)/g,(_,day:string,month:string,year:string)=>`${day.replace(/\s/g,'')}.${month.replace(/\s/g,'')}.${year.replace(/\s/g,'')}`).trim());
      page.cleanup();
    }
    return pages;
  } finally {
    await document.destroy();
  }
}
