export async function notificationImage(file:File):Promise<string>{
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20*1024*1024)throw new Error('Pilih gambar JPG, PNG atau WebP sehingga 20 MB.');
 const url=URL.createObjectURL(file);
 try{
 const image=new Image();image.src=url;await image.decode();
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw new Error('Gambar tidak dapat diproses.');
 for(const max of [1200,1000,800,640]){
 const ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 for(const quality of [.8,.65,.5]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=270000)return result;}
 }
 throw new Error('Gambar masih terlalu besar. Pilih gambar lain.');
 }finally{URL.revokeObjectURL(url);}
}
