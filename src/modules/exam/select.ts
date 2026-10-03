import { diagnosticQuota, ydsBlueprint, type Blueprint, type SectionId } from "./blueprint";

export type PoolItem = {
  id: string;
  slot: number;
  section: SectionId;
  stimulusId: string | null;
  difficulty: number;
  skillIds: string[];
};

function bySlot(items: PoolItem[]): PoolItem[] {
  return [...items].sort((a, b) => a.slot - b.slot);
}

function takeFromStimulus(items: PoolItem[], count: number, used: Set<string>): PoolItem[] {
  const groups = new Map<string, PoolItem[]>();
  for (const item of bySlot(items)) {
    if (!item.stimulusId || used.has(item.id)) continue;
    const group = groups.get(item.stimulusId) ?? [];
    group.push(item);
    groups.set(item.stimulusId, group);
  }
  const eligible = [...groups.values()].filter((group) => group.length >= count);
  const chosen = eligible[0]?.slice(0, count) ?? [];
  for (const item of chosen) used.add(item.id);
  return chosen;
}

function takeLoose(items: PoolItem[], count: number, used: Set<string>): PoolItem[] {
  const chosen = bySlot(items).filter((item) => !used.has(item.id)).slice(0, count);
  for (const item of chosen) used.add(item.id);
  return chosen;
}

export function studyPool(pool: PoolItem[]): PoolItem[] {
  const packed = new Set(pool.filter((item) => item.id.startsWith("pack-")).map((item) => item.section));
  if (packed.size === 0) return pool;
  return pool.filter((item) => !packed.has(item.section) || item.id.startsWith("pack-"));
}

export function selectDiagnostic(pool: PoolItem[], blueprint: Blueprint = ydsBlueprint): PoolItem[] {
  const used = new Set<string>();
  const picked: PoolItem[] = [];
  const source = studyPool(pool);
  for (const band of blueprint.bands) {
    const quota = diagnosticQuota[band.section];
    const sectionItems = source.filter((item) => item.section === band.section);
    if (band.section === "cloze") {
      picked.push(...takeFromStimulus(sectionItems, quota, used));
      continue;
    }
    if (band.section === "reading") {
      picked.push(...takeFromStimulus(sectionItems, 4, used));
      picked.push(...takeFromStimulus(sectionItems, 2, used));
      continue;
    }
    picked.push(...takeLoose(sectionItems, quota, used));
  }
  return picked;
}

export function selectMock(pool: PoolItem[]): PoolItem[] {
  const byNumber = new Map<number, PoolItem>();
  for (const item of pool) {
    if (item.slot >= 1 && item.slot <= ydsBlueprint.questionCount && !byNumber.has(item.slot)) {
      byNumber.set(item.slot, item);
    }
  }
  const mock: PoolItem[] = [];
  for (let slot = 1; slot <= ydsBlueprint.questionCount; slot += 1) {
    const item = byNumber.get(slot);
    if (!item) return [];
    mock.push(item);
  }
  return mock;
}

export type SelectRequest = {
  pool: PoolItem[];
  count: number;
  seenIds: string[];
  preferredSections: SectionId[];
  difficulty: number;
};

export function selectItems(request: SelectRequest): PoolItem[] {
  const seen = new Set(request.seenIds);
  const fresh = request.pool.filter((item) => !seen.has(item.id));
  const source = fresh.length >= request.count ? fresh : request.pool;
  const preferred = new Set(request.preferredSections);
  const ranked = [...source].sort((a, b) => {
    const aPref = preferred.has(a.section) ? 0 : 1;
    const bPref = preferred.has(b.section) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    const aDiff = Math.abs(a.difficulty - request.difficulty);
    const bDiff = Math.abs(b.difficulty - request.difficulty);
    if (aDiff !== bDiff) return aDiff - bDiff;
    return a.slot - b.slot;
  });
  const chosen: PoolItem[] = [];
  const sectionCounts = new Map<SectionId, number>();
  const cap = Math.max(1, Math.ceil(request.count * 0.4));
  for (const item of ranked) {
    const count = sectionCounts.get(item.section) ?? 0;
    if (count >= cap && chosen.length + (source.length - chosen.length) > request.count) {
      const rest = ranked.filter((candidate) => !chosen.includes(candidate) && (sectionCounts.get(candidate.section) ?? 0) < cap);
      if (rest.length > 0) continue;
    }
    chosen.push(item);
    sectionCounts.set(item.section, count + 1);
    if (chosen.length === request.count) break;
  }
  return chosen;
}
