import {summarySections,summaryInline} from './duty-summary';
export function WeeklySummaryPreview({text}:{text:string}){
 return <div className="weekly-formatted-preview" aria-label="Pratonton format rumusan">{summarySections(text).map((section,index)=><section key={index}><h4><span>{index+1}.</span> {section.heading}</h4>{section.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,p)=><p key={p}>{summaryInline(paragraph).map((run,r)=>run.style==='bold'?<strong key={r}>{run.text}</strong>:run.style==='italic'?<em key={r}>{run.text}</em>:run.text)}</p>)}</section>)}</div>;
}
