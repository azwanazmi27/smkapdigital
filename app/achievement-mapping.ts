export const achievementCategory='Lain-lain · Arkib Kejayaan';
/** Read only labelled legacy fields; venue and uploader never determine ownership. */
export function achievementInfo(name:string,metadata:unknown){
 const data=metadata&&typeof metadata==='object'?metadata as Record<string,unknown>:{};
 const field=(key:string)=>name.split('__'+key+'__')[1]?.split('__')[0]?.replace(/\.(pdf|png|jpe?g)$/i,'').trim()||'';
 const text=(key:string,fallback='')=>typeof data[key]==='string'&&String(data[key]).trim()?String(data[key]).trim():fallback;
 return {title:text('title',name.split('__')[0].replace(/^\d{4}-\d{2}-\d{2}-ARKIB-/i,'').replace(/\.(pdf|png|jpe?g)$/i,'')),field:text('achievementField',field('BIDANG')),level:text('achievementLevel',field('PERINGKAT')),result:text('achievementResult',field('PENCAPAIAN')),unitCategory:text('achievementUnit')};
}
export function achievementFolder(field:string){
 return ({Akademik:'kurikulum-4',Kokurikulum:'koko-6',Sukan:'koko-6',Sahsiah:'hem-13'} as Record<string,string>)[field]||'';
}
