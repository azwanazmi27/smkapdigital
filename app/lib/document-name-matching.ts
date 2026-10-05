import {env} from 'cloudflare:workers';
import {matchName,normalizeDocumentName,defaultThresholds,type MatchThresholds} from '../name-matching';
export async function matchDocumentRows<T extends {name:string}>(rows:T[],users:{id:string;name:string}[],trackUsage=false){
 const stored=await env.DB.prepare('SELECT normalized_source_name,user_id FROM name_match_mappings').all<{normalized_source_name:string;user_id:string|null}>();
 const legacy=await env.DB.prepare('SELECT source_name,user_id,updated_by,updated_at FROM staff_name_mappings').all<{source_name:string;user_id:string;updated_by:string;updated_at:string}>();
 const now=new Date().toISOString();
 const existing=new Set(stored.results.map(r=>r.normalized_source_name));
 const imports=[...new Map(legacy.results.map(r=>[normalizeDocumentName(r.source_name),r])).entries()].filter(([key])=>key&&!existing.has(key));
 if(imports.length){await env.DB.batch(imports.map(([key,r])=>env.DB.prepare("INSERT OR IGNORE INTO name_match_mappings(id,source_name,normalized_source_name,user_id,matched_user_name,match_type,confirmed_by,confirmed_at,created_at,updated_at) VALUES(?,?,?,?,?,'confirmed',?,?,?,?)").bind(crypto.randomUUID(),r.source_name,key,r.user_id,users.find(u=>u.id===r.user_id)?.name||'',r.updated_by,r.updated_at||now,r.updated_at||now,r.updated_at||now)));stored.results.push(...imports.map(([key,r])=>({normalized_source_name:key,user_id:r.user_id})));}
 const saved=Object.fromEntries(stored.results.map(r=>[r.normalized_source_name,{userId:r.user_id}]));
 const settings=await env.DB.prepare("SELECT high,review,margin FROM name_match_settings WHERE id='default'").first<MatchThresholds>()||defaultThresholds;
 const result=rows.map(row=>({...row,...matchName(row.name,users,saved,settings)}));
 if(trackUsage){const keys=[...new Set(result.filter(r=>r.match_type==='Saved Mapping'||r.match_type==='Confirmed No Match').map(r=>normalizeDocumentName(r.name)))];if(keys.length)await env.DB.batch(keys.map(key=>env.DB.prepare('UPDATE name_match_mappings SET usage_count=usage_count+1,last_used_at=? WHERE normalized_source_name=?').bind(new Date().toISOString(),key)));}
 return result;
}
