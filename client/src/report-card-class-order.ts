export const REPORT_CARD_CLASS_ORDER = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
] as const;

const normaliseClass = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export const reportCardClassRank = (value: unknown) => {
  const label = normaliseClass(value);
  const match = label.match(/(?:grade|class)?\s*(?:\(|)?(\d)(?:\))?/i);
  const number = match ? Number(match[1]) : NaN;
  return Number.isFinite(number) && number >= 1 && number <= 9 ? number : 999;
};

export const compareReportCardClasses = (a: unknown, b: unknown) => {
  const rankDifference = reportCardClassRank(a) - reportCardClassRank(b);
  if (rankDifference !== 0) return rankDifference;
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
};

export const sortReportCardsByClass = <T>(items: T[], getClass: (item: T) => unknown) =>
  [...items].sort((a, b) => compareReportCardClasses(getClass(a), getClass(b)));
