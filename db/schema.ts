import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const managementMaterials = sqliteTable("management_materials", {
 id:text("id").primaryKey(),schoolYear:integer("school_year").notNull(),folderId:text("folder_id").notNull(),
 title:text("title").notNull(),documentType:text("document_type").notNull(),sourceUrl:text("source_url").notNull().default(""),
 storageKey:text("storage_key").notNull().default(""),mimeType:text("mime_type").notNull().default(""),originalName:text("original_name").notNull().default(""),
 notes:text("notes").notNull().default(""),visibility:text("visibility").notNull().default("private"),
 ownerEmail:text("owner_email").notNull(),ownerName:text("owner_name").notNull(),createdAt:text("created_at").notNull(),
},table=>[index("idx_management_year_folder").on(table.schoolYear,table.folderId)]);

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
export const skasYears = sqliteTable("skas_years", {
  schoolYear: integer("school_year").primaryKey(), status: text("status").notNull().default("draft"), preparedFrom: integer("prepared_from"), activationDate: text("activation_date"), closedAt: text("closed_at"), createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const skasEvidence = sqliteTable("skas_evidence", {
  id: text("id").primaryKey(), schoolYear: integer("school_year").notNull(), domain: text("domain").notNull(), unitName: text("unit_name").notNull(), evidenceType: text("evidence_type").notNull(), title: text("title").notNull(), standardCode: text("standard_code").notNull().default(""), sourceType: text("source_type").notNull(), sourceUrl: text("source_url").notNull().default(""), storageKey: text("storage_key").notNull().default(""), mimeType: text("mime_type").notNull().default(""), originalName: text("original_name").notNull().default(""), notes: text("notes").notNull().default(""), status: text("status").notNull().default("pending"), submittedByEmail: text("submitted_by_email").notNull(), submittedByName: text("submitted_by_name").notNull(), verifiedByEmail: text("verified_by_email").notNull().default(""), verifiedByName: text("verified_by_name").notNull().default(""), verifiedAt: text("verified_at").notNull().default(""), sourceModule: text("source_module").notNull().default(""), sourceRecordId: text("source_record_id").notNull().default(""), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_skas_evidence_year_domain_status").on(table.schoolYear,table.domain,table.status),uniqueIndex("idx_skas_evidence_source_record").on(table.sourceModule,table.sourceRecordId).where(sql`${table.sourceRecordId} != ''`)]);
export const skasMappingRules = sqliteTable("skas_mapping_rules", {
  id: text("id").primaryKey(), category: text("category").notNull(), signalProfile: text("signal_profile").notNull().default("regular"), domain: text("domain").notNull(), unitName: text("unit_name").notNull(), evidenceType: text("evidence_type").notNull(), standardCode: text("standard_code").notNull(), updatedByEmail: text("updated_by_email").notNull(), updatedByName: text("updated_by_name").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_skas_mapping_rules_category_signal").on(table.category,table.signalProfile)]);
