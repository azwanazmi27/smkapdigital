export type EvidenceRecord = {
  id: string; schoolYear: number; standardCode: string; domain: string; unitName: string;
  evidenceType: string; title: string; status: string; sourceType: string; sourceUrl: string;
  originalName: string; notes: string; submittedByName: string; verifiedByName: string;
  verifiedAt: string; createdAt: string; sourceModule: string;
};

export function matchesStandard(value: string, standard: string) {
  return value === standard || value.startsWith(`${standard}.`);
}

export function evidenceScope<T extends EvidenceRecord>(records: T[], year: number, monitor: boolean) {
  return records.filter(item => Number(item.schoolYear) === year && (!monitor || item.status === 'approved'));
}

export function filterEvidence<T extends EvidenceRecord>(records: T[], filters: {
  standard?: string; unit?: string; type?: string; status?: string; query?: string;
}) {
  const query = (filters.query || '').trim().toLocaleLowerCase('ms-MY');
  return records.filter(item =>
    (!filters.standard || matchesStandard(item.standardCode, filters.standard)) &&
    (!filters.unit || JSON.stringify([item.domain, item.unitName]) === filters.unit) &&
    (!filters.type || item.evidenceType === filters.type) &&
    (!filters.status || item.status === filters.status) &&
    (!query || [item.title, item.unitName, item.domain, item.evidenceType, item.submittedByName, item.sourceModule].join(' ').toLocaleLowerCase('ms-MY').includes(query))
  );
}

export function evidenceUnits(records: EvidenceRecord[]) {
  const groups = new Map<string, {key: string; domain: string; name: string; count: number}>();
  for (const item of records) {
    const key = JSON.stringify([item.domain, item.unitName]);
    const group = groups.get(key) || {key, domain: item.domain, name: item.unitName || 'Unit belum dinyatakan', count: 0};
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a,b) => `${a.domain} ${a.name}`.localeCompare(`${b.domain} ${b.name}`, 'ms'));
}

export function evidenceLink(item: EvidenceRecord) {
  if (item.sourceType === 'upload') return `/api/skas?file=${encodeURIComponent(item.id)}`;
  try { const url = new URL(item.sourceUrl); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
