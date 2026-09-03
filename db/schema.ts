import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const teachers = sqliteTable("teachers", { id: text("id").primaryKey(), name: text("name").notNull(), category: text("category").notNull(), createdAt: text("created_at").notNull() });
export const absences = sqliteTable("absences", { id: text("id").primaryKey(), teacherId: text("teacher_id").notNull(), teacherName: text("teacher_name").notNull(), category: text("category").notNull(), absenceDate: text("absence_date").notNull(), endDate: text("end_date"), reason: text("reason").notNull(), duration: text("duration").notNull(), startTime: text("start_time"), endTime: text("end_time"), note: text("note").notNull().default(""), reliefStatus: text("relief_status").notNull().default("pending"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull() });
export const reliefSchedules = sqliteTable("relief_schedules", { id: text("id").primaryKey(), fileName: text("file_name").notNull(), sourceLabel: text("source_label").notNull(), teacherCount: text("teacher_count").notNull(), isActive: text("is_active").notNull(), teachersJson: text("teachers_json").notNull(), createdAt: text("created_at").notNull() });
export const reliefSettings = sqliteTable("relief_settings", { id: text("id").primaryKey(), payloadJson: text("payload_json").notNull(), updatedAt: text("updated_at").notNull() });
export const reliefPlans = sqliteTable("relief_plans", { id: text("id").primaryKey(), date: text("date").notNull(), day: text("day").notNull(), createdBy: text("created_by").notNull(), assignmentsJson: text("assignments_json").notNull(), fileName: text("file_name").notNull(), createdAt: text("created_at").notNull() });
export const oprReports = sqliteTable("opr_reports", { id: text("id").primaryKey(), name: text("name").notNull(), category: text("category").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), viewUrl: text("view_url").notNull(), previewUrl: text("preview_url").notNull(), downloadUrl: text("download_url").notNull(), syncedAt: text("synced_at").notNull() });
export const oprIntakeMetadata = sqliteTable("opr_intake_metadata", {
  reportId: text("report_id").primaryKey(),
  createdByEmail: text("created_by_email").notNull().default(""),
  category: text("category").notNull(),
  competitionStatus: text("competition_status").notNull().default("0"),
  externalInvolvementStatus: text("external_involvement_status").notNull().default("0"),
  suggestedSkasJson: text("suggested_skas_json").notNull().default("[]"),
  payloadJson: text("payload_json").notNull().default("{}"),
  reviewStatus: text("review_status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_opr_intake_review_status").on(table.reviewStatus)]);
