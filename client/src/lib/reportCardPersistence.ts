import type { SupabaseClient } from "@supabase/supabase-js";

type ReportCardItemInput = {
  subject_id: string;
  score: number | null;
  maximum_score: number | null;
  grade: string | null;
};

type PersistArgs = {
  studentId: string;
  termId: string;
  classId: string;
  attendancePercentage: number | null;
  averageScore: number | null;
  teacherRemark: string | null;
  headteacherRemark: string | null;
  generatedBy: string | null;
  items: ReportCardItemInput[];
};

export async function persistReportCardWithItems(
  db: SupabaseClient,
  args: PersistArgs,
) {
  const { data, error } = await db.rpc("persist_report_card_with_items", {
    p_student_id: args.studentId,
    p_term_id: args.termId,
    p_class_id: args.classId,
    p_attendance_percentage: args.attendancePercentage,
    p_average_score: args.averageScore,
    p_teacher_remark: args.teacherRemark,
    p_headteacher_remark: args.headteacherRemark,
    p_generated_by: args.generatedBy,
    p_items: args.items,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.report_card_id) throw new Error("Report card persistence returned no report_card_id.");
  return {
    reportCardId: String(row.report_card_id),
    itemCount: Number(row.item_count ?? 0),
  };
}
