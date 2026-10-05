// Derive aSc cell geometry from PDF text headers and transformed vector rules.
export function ascGrid(items,height,operators,OPS,periodCount=19){
 const text=items.filter(i=>i.str.trim()).map(i=>({...i,x:i.transform[4],top:height-i.transform[5]-i.height,cy:height-i.transform[5]-i.height/2}));
 const days=['Mo','Tu','We','Th','Fr'].map(day=>text.find(i=>i.str===day));
 if(days.some(i=>!i))throw Error('Label hari jadual aSc tidak dapat dikenal pasti.');
 const headers=text.filter(i=>/^\d+$/.test(i.str)&&i.top<days[0].top&&i.x>days[0].x).filter(i=>Number(i.str)>=1&&Number(i.str)<=periodCount);
 const row=headers.filter(i=>Math.abs(i.cy-headers.find(x=>x.str==='1')?.cy)<3).sort((a,b)=>Number(a.str)-Number(b.str));
 if(row.length!==periodCount||row.some((item,i)=>Number(item.str)!==i+1))throw Error('Lajur waktu jadual aSc tidak dapat disahkan.');
 const centers=row.map(i=>i.x+i.width/2),step=(centers[periodCount-1]-centers[0])/(periodCount-1),left=centers[0]-step/2;
 const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
 let matrix=[1,0,0,1,0,0],stack=[],lines=[];
 for(let i=0;i<operators.fnArray.length;i++){
  const op=operators.fnArray[i],args=operators.argsArray[i];
  if(op===OPS.save)stack.push([...matrix]);
  else if(op===OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];
  else if(op===OPS.transform)matrix=mul(matrix,args);
  else if(op===OPS.constructPath&&args?.[2]){
   const [x,y,x2,y2]=args[2];if(Math.abs(x-x2)>1||Math.abs(y-y2)<10)continue;
   const px=matrix[0]*x+matrix[2]*y+matrix[4],py=height-(matrix[1]*x+matrix[3]*y+matrix[5]),qy=height-(matrix[1]*x2+matrix[3]*y2+matrix[5]);
   lines.push({x:px,top:Math.min(py,qy),bottom:Math.max(py,qy)});
  }
 }
 return days.map((day,index)=>{
  const spacing=index?day.cy-days[index-1].cy:days[1].cy-day.cy;
  const top=day.cy-spacing/2,bottom=day.cy+spacing/2;
  const boundaries=new Set([periodCount]);
  for(const line of lines){if(line.top>day.cy||line.bottom<day.cy)continue;const period=Math.round((line.x-left)/step);if(period>0&&period<=periodCount&&Math.abs(line.x-(left+period*step))<2)boundaries.add(period);}
  const cells=new Map();
  for(const item of text.filter(i=>i.x>=left-1&&i.cy>top&&i.cy<bottom)){
   const period=Math.max(1,Math.min(periodCount,Math.floor((item.x-left+1)/step)+1));let start=1;for(const edge of boundaries)if(edge<period)start=Math.max(start,edge+1);
   const cell=cells.get(start)||[];cell.push(item);cells.set(start,cell);
  }
  return {boundaries,cells};
 });
}
