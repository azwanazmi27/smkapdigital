import {documentNameKey,documentUserMatcher} from './staff-work-model';
// Resolve each source name once per run, including unsuccessful matches.
export function reminderNameCache(names:string[],users:{id:string;name:string}[],confirmed:Record<string,string>){
 const result={...confirmed},match=documentUserMatcher(users);
 for(const name of names){const key=documentNameKey(name);if(!result[key])result[key]=match(name)||'__unmatched__';}
 return result;
}
