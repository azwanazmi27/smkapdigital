import {skasDomains, skasEvidenceTypes, skasStandards, type SkasMappingSuggestion} from './skas-catalog';

export const evidencePanitiaCategories = [["01","01 — Pengurusan Am"],["02","02 — Perancangan Strategik"],["03","03 — Mesyuarat"],["04","04 — Kurikulum dan Pentaksiran"],["05","05 — Perancangan dan Program"],["06","06 — Kewangan PCG"],["07","07 — Pembangunan Profesional"],["08","08 — Laporan dan Penilaian"]] as const;
export type EvidenceAISuggestion = SkasMappingSuggestion & {panitiaCategory: string};
export function validStandardDomain(standard: string, domain: string) {
  return standard==='1'?domain==='Pengurusan':standard==='2'?['Pengurusan','Kekuatan Sekolah'].includes(domain):standard==='3.1'?domain==='Kurikulum':standard==='3.2'?domain==='Kokurikulum':standard==='3.3'?domain==='Hal Ehwal Murid':standard==='4'?domain==='Pengajaran dan Pembelajaran':standard.startsWith('5.')?domain==='Pencapaian':false;
}
export function parseEvidenceSuggestion(value: unknown): EvidenceAISuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const standard = skasStandards.find(([code])=>code===v.standardCode);
  const domain = skasDomains.find(d=>d.name===v.domain);
  if (!standard || !domain || !validStandardDomain(standard[0], domain.name) || !domain.units.some(u=>u===v.unitName) || !skasEvidenceTypes.some(t=>t===v.evidenceType) || !evidencePanitiaCategories.some(([id])=>id===v.panitiaCategory) || typeof v.reason!=='string' || !v.reason.trim()) return null;
  return {standardCode:standard[0], standardLabel:standard[1], domain:domain.name, unitName:v.unitName as string, evidenceType:v.evidenceType as EvidenceAISuggestion['evidenceType'], panitiaCategory:v.panitiaCategory as string, reason:v.reason.trim().slice(0,800), confidence:v.confidence==='tinggi'?'tinggi':'sederhana'};
}
