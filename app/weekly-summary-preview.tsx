import {summarySections,summaryInline,summaryBlocks} from './duty-summary';
function Inline({text}:{text:string}){return <>{summaryInline(text).map((run,r)=>run.style==='bold'?<strong key={r}>{run.text}</strong>:run.style==='italic'?<em key={r}>{run.text}</em>:run.text)}</>;}
export function WeeklySummaryPreview({text}:{text:string}){
 return <div className="weekly-formatted-preview" aria-label="Pratonton format rumusan">{summarySections(text).map((section,index)=><section key={index}><h4><span>{index+1}.</span> {section.heading}</h4>{summaryBlocks(section.body).map((block,p)=>block.kind==='day'?<div className="weekly-day-notes" key={p}><strong>{block.label}</strong><ul>{block.items.map((item,i)=><li key={i}><Inline text={item}/></li>)}</ul></div>:<p key={p}><Inline text={block.text}/></p>)}</section>)}</div>;
}
