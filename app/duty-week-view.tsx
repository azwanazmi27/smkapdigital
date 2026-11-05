import {CalendarDays,ChevronDown,Users} from 'lucide-react';
export type DutyMember={userId:string;name:string;role:string;startDate:string;endDate:string};
export function DutyWeekView({members,title,children,active=true}:{members:DutyMember[];title?:string;children?:React.ReactNode;active?:boolean}){
 const first=members[0];if(!first)return null;
 const format=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)?new Intl.DateTimeFormat('ms-MY',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(date+'T12:00:00+08:00')):'Tarikh belum ditetapkan';
 const week=first.role.match(/minggu\s*(\d{1,2})/i)?.[1];
 return <details className="duty-roster-card" open={active}><summary><CalendarDays aria-hidden="true"/><span><strong>{title|| (week?`Minggu ${week}`:'Jadual guru bertugas')}</strong><small>{title&&week?`Minggu ${week} · `:null}{format(first.startDate)} – {format(first.endDate)}</small></span><ChevronDown aria-hidden="true"/></summary><div className="duty-roster-body"><p><Users aria-hidden="true"/> {members.length} guru bertugas</p><ul>{members.map((m,i)=><li key={m.userId+':'+i}><span aria-hidden="true">{m.name.split(/\s+/).slice(0,2).map(n=>n[0]).join('')}</span><strong>{m.name}</strong></li>)}</ul>{children}</div></details>;
}
