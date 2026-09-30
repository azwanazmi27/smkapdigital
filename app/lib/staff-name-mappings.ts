import {env} from 'cloudflare:workers';
export async function staffNameMappings():Promise<Record<string,string>>{
 const rows=await env.DB.prepare('SELECT m.name_key,m.user_id FROM staff_name_mappings m JOIN portal_users u ON u.id=m.user_id WHERE u.status=\'active\' AND u.deleted_at IS NULL').all<{name_key:string;user_id:string}>();
 return Object.fromEntries(rows.results.map(row=>[row.name_key,row.user_id]));
}
