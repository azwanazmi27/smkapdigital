import type { env } from 'cloudflare:workers';
export const teacherNameKey = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('ms-MY');

// Only exact names (apart from case/spacing) are automatically matched.
// Abbreviations and similar names require an explicit administrator decision.
export function reviewNames(input: unknown) {
 if (!Array.isArray(input)) return [];
 const names = new Map<string,string>();
 for (const item of input) {
  if (typeof item?.name !== 'string') continue;
  const name = teacherNameKey(item.name);
  if (name && name.length <= 180) names.set(name,name);
 }
 return [...names].map(([key,name])=>({key,name}));
}

export async function syncTeacherReview(db: typeof env.DB, scheduleId: string, sourceLabel: string, input: unknown) {
 const existing = await db.prepare('SELECT id,name FROM teachers').all<{id:string;name:string}>();
 const known = new Map<string,string>(existing.results.map((t:{id:string;name:string})=>[teacherNameKey(t.name),t.id]));
 const now = new Date().toISOString();
 const statements = reviewNames(input).map(({key,name})=>db.prepare(`INSERT INTO relief_teacher_review
  (name_key,name,schedule_id,source_label,status,teacher_id,reviewed_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
  ON CONFLICT(name_key) DO UPDATE SET schedule_id=excluded.schedule_id,source_label=excluded.source_label,updated_at=excluded.updated_at,
  status=CASE WHEN excluded.teacher_id!='' THEN 'approved' ELSE relief_teacher_review.status END,
  teacher_id=CASE WHEN excluded.teacher_id!='' THEN excluded.teacher_id ELSE relief_teacher_review.teacher_id END`)
  .bind(key,name,scheduleId,sourceLabel,known.has(key)?'approved':'pending',known.get(key)||'',known.has(key)?now:'',now));
 for(let i=0;i<statements.length;i+=80) await db.batch(statements.slice(i,i+80));
}
