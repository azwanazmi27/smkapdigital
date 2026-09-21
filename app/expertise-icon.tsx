import {Award,BookOpen,ClipboardCheck,Code2,FlaskConical,Languages,Medal,Monitor,Music,Palette,ShieldCheck} from 'lucide-react';
// Match only the user's actual portfolio text; a badge does not confer certification.
export function ExpertiseIcon({title,issuer=''}:{title:string;issuer?:string}) {
 const value=`${title} ${issuer}`.toLowerCase();
 if(/google/.test(value))return <img src="/expertise-icons/google.png" alt="" aria-hidden="true"/>;
 if(/apple/.test(value))return <img src="/expertise-icons/apple.svg" alt="" aria-hidden="true"/>;
 if(/woodball|wood ball/.test(value))return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M12 7l13 24" stroke="#B9E8E7" strokeWidth="3.5" strokeLinecap="round"/><rect x="18" y="29" width="18" height="8" rx="3" transform="rotate(-28 18 29)" fill="#D8B887" stroke="#F3DCB4" strokeWidth="1.5"/><circle cx="12" cy="38" r="5" fill="#D8B887"/><path d="M34 9v13m9-13v13m-9-7h9" stroke="#A9E7DC" strokeWidth="2.5" strokeLinecap="round"/></svg>;
 const Icon=/pemeriksa|semakan|penilai|moderator|pemarkah/.test(value)?ClipboardCheck:/kod|coding|programming|robot/.test(value)?Code2:/sains|science|stem|kimia|fizik/.test(value)?FlaskConical:/bahasa|language|linguistik/.test(value)?Languages:/sukan|sport|jurulatih|coach|pengadil/.test(value)?Medal:/muzik|music/.test(value)?Music:/seni|art|design|canva/.test(value)?Palette:/digital|ict|teknologi|komputer/.test(value)?Monitor:/keselamatan|safety|pertolongan/.test(value)?ShieldCheck:/pendidikan|education|guru|teacher|pedagog/.test(value)?BookOpen:Award;
 return <Icon aria-hidden="true"/>;
}
