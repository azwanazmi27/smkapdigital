'use client';
import {suggestManagementMaterial,type ManagementSuggestion} from './management-suggestions';
export function ManagementSuggestionCard({doc,disabled,onUse}:{doc:{folderId:string;title:string;documentType:string};disabled:boolean;onUse:(s:ManagementSuggestion)=>void}){
 const suggestion=suggestManagementMaterial(doc);
 if(!suggestion)return <p>Folder tidak dikenali. Gunakan pemetaan manual.</p>;
 return <aside className="management-form"><strong>Cadangan SK@S · perlu semakan</strong><p>Standard {suggestion.standardCode} · {suggestion.standardLabel}</p><p>{suggestion.unitName}</p><p>{suggestion.reason}</p><button type="button" disabled={disabled} onClick={()=>onUse(suggestion)}>Guna cadangan</button></aside>;
}
