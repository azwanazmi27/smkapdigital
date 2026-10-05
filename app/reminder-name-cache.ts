import {documentNameKey,matchDocumentUserId} from './staff-work-model';
// Resolve each source name once per run, including unsuccessful matches.
export function reminderNameCache(names:string[],users:{id:string;name:string}[],confirmed:Record<string,string>){
 const result={...confirmed};
 for(const name of names){const key=documentNameKey(name);if(!result[key])result[key]=matchDocumentUserId(name,users)||'__unmatched__';}
 return result;
}
