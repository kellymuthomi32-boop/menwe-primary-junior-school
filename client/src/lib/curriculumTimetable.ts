export type CurriculumBand = "JUNIOR" | "PRIMARY";

export type WeeklyAllocation = {
  key: string;
  label: string;
  aliases: string[];
  lessonsPerWeek: number;
  required: boolean;
};

export const JUNIOR_WEEKLY_ALLOCATION: WeeklyAllocation[] = [
  { key: "ENGLISH", label: "English", aliases: ["english"], lessonsPerWeek: 5, required: true },
  { key: "KISWAHILI_KSL", label: "Kiswahili / KSL", aliases: ["kiswahili", "kiswahili / ksl", "kenya sign language", "ksl"], lessonsPerWeek: 4, required: true },
  { key: "MATHEMATICS", label: "Mathematics", aliases: ["mathematics", "maths", "math"], lessonsPerWeek: 5, required: true },
  { key: "INTEGRATED_SCIENCE", label: "Integrated Science", aliases: ["integrated science", "science"], lessonsPerWeek: 5, required: true },
  { key: "PRE_TECHNICAL", label: "Pre-Technical Studies", aliases: ["pre-technical studies", "pre-technical", "pre technical"], lessonsPerWeek: 4, required: true },
  { key: "SOCIAL_STUDIES", label: "Social Studies", aliases: ["social studies"], lessonsPerWeek: 4, required: true },
  { key: "RELIGIOUS_EDUCATION", label: "Religious Education", aliases: ["religious education", "cre", "hre", "ire"], lessonsPerWeek: 4, required: true },
  { key: "AGRICULTURE", label: "Agriculture", aliases: ["agriculture", "agriculture and nutrition"], lessonsPerWeek: 4, required: true },
  { key: "CREATIVE_ARTS_SPORTS", label: "Creative Arts & Sports", aliases: ["creative arts and sports", "creative arts", "sports", "creative arts & sports"], lessonsPerWeek: 5, required: true },
  { key: "PPI", label: "Pastoral / Religious Instruction Programme", aliases: ["ppi", "pastoral instruction", "pastoral / religious instruction programme"], lessonsPerWeek: 1, required: true },
];

export const JUNIOR_TOTAL_LESSONS = JUNIOR_WEEKLY_ALLOCATION.reduce((sum, item) => sum + item.lessonsPerWeek, 0);
export const JUNIOR_INSTRUCTION_LESSONS = JUNIOR_TOTAL_LESSONS - 1;

export function normalizeSubjectName(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");
}

export function allocationForSubject(name: unknown): WeeklyAllocation | null {
  const normalized = normalizeSubjectName(name);
  return JUNIOR_WEEKLY_ALLOCATION.find(item => item.aliases.some(alias => {
    const a = normalizeSubjectName(alias);
    return normalized === a || normalized.includes(a) || a.includes(normalized);
  })) ?? null;
}

export function curriculumProgress(subjectName: unknown, assignedLessons: number) {
  const target = allocationForSubject(subjectName);
  if (!target) return { target: 0, assigned: assignedLessons, remaining: 0, status: "UNMAPPED" as const };
  const remaining = Math.max(0, target.lessonsPerWeek - assignedLessons);
  return {
    target: target.lessonsPerWeek,
    assigned: assignedLessons,
    remaining,
    status: assignedLessons === target.lessonsPerWeek ? "OK" as const : assignedLessons < target.lessonsPerWeek ? "SHORT" as const : "OVER" as const,
  };
}
