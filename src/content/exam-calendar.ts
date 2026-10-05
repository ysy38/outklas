export type ExamFamily = "yds" | "eyds" | "yokdil" | "eyokdil";

export type Sitting = {
  id: string;
  family: ExamFamily;
  name: string;
  date: string;
  detail: string;
  applyFrom?: string;
  applyUntil?: string;
  lateApply?: string;
};

/** ÖSYM 2026 sınav takvimi, osym.gov.tr. Gelecek oturumlar ve her ailedeki son tarih. */
export const sittings: Sitting[] = [
  {
    id: "eyokdil-2026-3",
    family: "eyokdil",
    name: "e-YÖKDİL 2026/3",
    date: "2026-06-06",
    detail: "İngilizce, fen bilimleri",
  },
  {
    id: "yokdil-2026-2",
    family: "yokdil",
    name: "YÖKDİL 2026/2",
    date: "2026-08-09",
    detail: "2026’daki son YÖKDİL",
  },
  {
    id: "eyds-2026-11",
    family: "eyds",
    name: "e-YDS 2026/11",
    date: "2026-10-17",
    detail: "Farsça ve İngilizce",
    applyFrom: "2026-09-30",
    applyUntil: "2026-10-08",
  },
  {
    id: "yds-2026-2",
    family: "yds",
    name: "YDS 2026/2",
    date: "2026-11-22",
    detail: "Saat 10.15",
    applyFrom: "2026-09-30",
    applyUntil: "2026-10-08",
    lateApply: "2026-10-14",
  },
  {
    id: "eyds-2026-12",
    family: "eyds",
    name: "e-YDS 2026/12",
    date: "2026-12-19",
    detail: "İngilizce",
    applyFrom: "2026-12-02",
    applyUntil: "2026-12-10",
  },
];

export function istanbulDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysUntil(day: string, now = new Date()): number {
  const [year, month, date] = istanbulDay(now).split("-").map(Number);
  const [examYear, examMonth, examDate] = day.split("-").map(Number);
  const today = Date.UTC(year, month - 1, date);
  const exam = Date.UTC(examYear, examMonth - 1, examDate);
  return Math.round((exam - today) / 86_400_000);
}

export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function countdownText(days: number): string {
  if (days < 0) return "geçti";
  if (days === 0) return "bugün";
  if (days === 1) return "yarın";
  return `${days} gün kaldı`;
}

export function upcomingSittings(now = new Date()) {
  return sittings
    .map((sitting) => ({ ...sitting, days: daysUntil(sitting.date, now) }))
    .filter((sitting) => sitting.days >= 0)
    .sort((a, b) => a.days - b.days);
}

export function finishedFamilies(now = new Date()): { family: ExamFamily; sitting: Sitting }[] {
  const open = new Set(upcomingSittings(now).map((sitting) => sitting.family));
  const families: ExamFamily[] = ["yds", "eyds", "yokdil", "eyokdil"];
  return families
    .filter((family) => !open.has(family))
    .map((family) => {
      const sitting = sittings
        .filter((row) => row.family === family)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      return { family, sitting };
    });
}
