export type NameCandidate={userId:string;name:string;score:number};
export type NameMatch={original_name:string;normalized_name:string;userId:string;match_type:string;similarity_score:number|null;candidates:NameCandidate[]};
export type MatchThresholds={high:number;review:number;margin:number};
export const defaultThresholds:MatchThresholds={high:95,review:85,margin:5};
// Conservative identity key. Spelling variants belong in suggestions, not identity keys.
export function normalizeDocumentName(value:string){return value.normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/^(?:(?:EN|ENCIK|PN|PUAN|TN|TUAN|HAJI|HJ|HAJAH|HJH|CIKGU|USTAZ|USTAZAH|DR)\s+)+/,'').replace(/\bB\b/g,'BIN').replace(/\b(?:BT|BTE)\b/g,'BINTI').replace(/\s+/g,' ').trim();}
function suggestionKey(value:string){return normalizeDocumentName(value).replace(/\b(?:MUHAMAD|MUHAMMAD|MOHAMAD|MOHAMMAD|MOHAMMED|MOHD)\b/g,'MUHAMMAD').replace(/\bABD\b/g,'ABDUL').replace(/\b(?:BIN|BINTI)\b/g,'').replace(/\s+/g,'');}
export function nameSimilarity(a:string,b:string){const x=suggestionKey(a),y=suggestionKey(b);if(!x||!y)return 0;let prev=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){const next=[i];for(let j=1;j<=y.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(x[i-1]===y[j-1]?0:1));prev=next;}return Math.round((1-prev[y.length]/Math.max(x.length,y.length))*10000)/100;}
export function matchName(name:string,users:{id:string;name:string}[],saved:Record<string,{userId:string|null}>,thresholds=defaultThresholds):NameMatch{
 const normalized=normalizeDocumentName(name),base={original_name:name,normalized_name:normalized,userId:'',match_type:'No Match',similarity_score:null,candidates:[]} as NameMatch;
 if(!normalized)return base;
 const memory=saved[normalized];if(memory){if(memory.userId===null)return {...base,match_type:'Confirmed No Match'};if(users.some(u=>u.id===memory.userId))return {...base,userId:memory.userId,match_type:'Saved Mapping',similarity_score:100};return {...base,match_type:'Review Required'};}
 const exact=users.filter(u=>u.name===name);if(exact.length===1)return {...base,userId:exact[0].id,match_type:'Exact Match',similarity_score:100};
 const normalizedMatches=users.filter(u=>normalizeDocumentName(u.name)===normalized);if(normalizedMatches.length===1)return {...base,userId:normalizedMatches[0].id,match_type:'Normalized Exact Match',similarity_score:100};
 const candidates=users.map(u=>({userId:u.id,name:u.name,score:nameSimilarity(name,u.name)})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,3);
 const score=candidates[0]?.score||0,ambiguous=normalizedMatches.length>1||score-(candidates[1]?.score||0)<thresholds.margin;
 // Even high-confidence fuzzy candidates require human confirmation.
 return {...base,candidates,similarity_score:score,match_type:score>=thresholds.high&&!ambiguous?'High Confidence Candidate':score>=thresholds.review?'Review Required':'Low Confidence'};
}
