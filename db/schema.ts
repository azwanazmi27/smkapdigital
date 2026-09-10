import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const managementMaterials = sqliteTable("management_materials", {
 id:text("id").primaryKey(),schoolYear:integer("school_year").notNull(),folderId:text("folder_id").notNull(),
 title:text("title").notNull(),documentType:text("document_type").notNull(),sourceUrl:text("source_url").notNull().default(""),
 storageKey:text("storage_key").notNull().default(""),mimeType:text("mime_type").notNull().default(""),originalName:text("original_name").notNull().default(""),
 notes:text("notes").notNull().default(""),visibility:text("visibility").notNull().default("private"),
 ownerEmail:text("owner_email").notNull(),ownerName:text("owner_name").notNull(),createdAt:text("created_at").notNull(),
 deletedAt:text("deleted_at").notNull().default(""),deletedBy:text("deleted_by").notNull().default(""),
},table=>[index("idx_management_year_folder").on(table.schoolYear,table.folderId)]);

export const managementReportFolders = sqliteTable("management_report_folders", {
 reportId:text("report_id").primaryKey(),folderId:text("folder_id").notNull(),documentType:text("document_type").notNull().default(""),updatedBy:text("updated_by").notNull(),updatedAt:text("updated_at").notNull(),
});
export const teachers = sqliteTable("teachers", { id: text("id").primaryKey(), name: text("name").notNull(), category: text("category").notNull(), createdAt: text("created_at").notNull() });
export const staffPortfolio = sqliteTable('staff_portfolio', {
 id:text('id').primaryKey(),userId:text('user_id').notNull(),title:text('title').notNull(),issuer:text('issuer').notNull().default(''),
 awardDate:text('award_date').notNull().default(''),featured:integer('featured').notNull().default(0),createdAt:text('created_at').notNull(),
},table=>[index('idx_portfolio_user').on(table.userId)]);
export const reliefTeacherReview = sqliteTable("relief_teacher_review", {
 nameKey:text("name_key").primaryKey(),name:text("name").notNull(),scheduleId:text("schedule_id").notNull(),sourceLabel:text("source_label").notNull(),
 status:text("status").notNull().default("pending"),teacherId:text("teacher_id").notNull().default(""),reviewedAt:text("reviewed_at").notNull().default(""),updatedAt:text("updated_at").notNull(),
});
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
export const absenceReasons = sqliteTable('absence_reasons', { reason:text('reason').primaryKey(), createdAt:text('created_at').notNull() });
export const absenceReasonSettings = sqliteTable('absence_reason_settings', { id:text('id').primaryKey() });

// Satu rekod induk untuk setiap dokumen. Kandungan fail kekal di Google Drive;
// D1 hanya menyimpan metadata, versi dan pemetaan silang modul.
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(), schoolId: text("school_id").notNull().default("CRA8001"), academicYearId: integer("academic_year_id").notNull(),
  panelId: text("panel_id").notNull().default(""), programmeId: text("programme_id").notNull().default(""), sourceModule: text("source_module").notNull(),
  documentType: text("document_type").notNull(), title: text("title").notNull(), referenceNumber: text("reference_number").notNull().default(""),
  status: text("status").notNull().default("draft"), currentVersionId: text("current_version_id").notNull().default(""), ownerUserId: text("owner_user_id").notNull().default(""),
  createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(), archivedAt: text("archived_at").notNull().default(""),
}, table => [index("idx_documents_year_panel").on(table.academicYearId, table.panelId), index("idx_documents_programme").on(table.programmeId), index("idx_documents_status").on(table.status)]);

export const documentVersions = sqliteTable("document_versions", {
  id: text("id").primaryKey(), documentId: text("document_id").notNull(), versionNumber: integer("version_number").notNull(), templateVersionId: text("template_version_id").notNull().default(""),
  driveFileId: text("drive_file_id").notNull(), driveFolderId: text("drive_folder_id").notNull().default(""), driveUrl: text("drive_url").notNull(), filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(), fileSize: integer("file_size").notNull().default(0), checksum: text("checksum").notNull().default(""), createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(), approvalStatus: text("approval_status").notNull().default("draft"),
}, table => [uniqueIndex("idx_document_versions_number").on(table.documentId, table.versionNumber), uniqueIndex("idx_document_versions_drive_file").on(table.driveFileId)]);

export const documentMappings = sqliteTable("document_mappings", {
  id: text("id").primaryKey(), documentId: text("document_id").notNull(), documentVersionId: text("document_version_id").notNull().default(""), destinationModule: text("destination_module").notNull(),
  destinationCategoryId: text("destination_category_id").notNull().default(""), destinationStandardId: text("destination_standard_id").notNull().default(""), mappingStatus: text("mapping_status").notNull().default("pending"),
  mappedBy: text("mapped_by").notNull(), mappedAt: text("mapped_at").notNull(), reviewedBy: text("reviewed_by").notNull().default(""), reviewedAt: text("reviewed_at").notNull().default(""),
}, table => [uniqueIndex("idx_document_mapping_destination").on(table.documentId, table.destinationModule, table.destinationCategoryId, table.destinationStandardId), index("idx_document_mappings_review").on(table.destinationModule, table.mappingStatus)]);

export const programmes = sqliteTable("programmes", {
  id: text("id").primaryKey(), schoolId: text("school_id").notNull().default("CRA8001"), academicYearId: integer("academic_year_id").notNull(), panelId: text("panel_id").notNull().default(""),
  title: text("title").notNull(), startDate: text("start_date").notNull().default(""), endDate: text("end_date").notNull().default(""), venue: text("venue").notNull().default(""),
  targetGroup: text("target_group").notNull().default(""), coordinatorUserId: text("coordinator_user_id").notNull().default(""), status: text("status").notNull().default("draft"),
  createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [index("idx_programmes_year_panel").on(table.academicYearId, table.panelId)]);

export const programmeDocuments = sqliteTable("programme_documents", {
  programmeId: text("programme_id").notNull(), documentId: text("document_id").notNull(), relationshipType: text("relationship_type").notNull(),
}, table => [uniqueIndex("idx_programme_documents_link").on(table.programmeId, table.documentId)]);

export const documentMappingRules = sqliteTable("document_mapping_rules", {
  id: text("id").primaryKey(), documentType: text("document_type").notNull(), epanitiaCategoryId: text("epanitia_category_id").notNull().default(""), managementFolderId: text("management_folder_id").notNull().default(""),
  skasStandardId: text("skas_standard_id").notNull().default(""), mappingMode: text("mapping_mode").notNull().default("confirm"), minimumStatus: text("minimum_status").notNull().default("approved"),
  versionPolicy: text("version_policy").notNull().default("latest_approved"), approverRoles: text("approver_roles").notNull().default("admin,super_admin"), updatedBy: text("updated_by").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [uniqueIndex("idx_document_mapping_rules_type").on(table.documentType)]);

export const schoolDocumentIdentity = sqliteTable("school_document_identity", {
  id: text("id").primaryKey(), versionNumber: integer("version_number").notNull(), payloadJson: text("payload_json").notNull(), active: integer("active").notNull().default(1), createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull(),
}, table => [uniqueIndex("idx_school_document_identity_version").on(table.versionNumber)]);

export const documentDrafts = sqliteTable("document_drafts", {
  id: text("id").primaryKey(), schoolYear: integer("school_year").notNull(), panelId: text("panel_id").notNull().default(""), programmeId: text("programme_id").notNull().default(""),
  documentType: text("document_type").notNull(), title: text("title").notNull().default(""), payloadJson: text("payload_json").notNull().default("{}"), step: integer("step").notNull().default(1),
  ownerUserId: text("owner_user_id").notNull(), createdBy: text("created_by").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [index("idx_document_drafts_owner_updated").on(table.ownerUserId, table.updatedAt), index("idx_document_drafts_year_panel").on(table.schoolYear, table.panelId)]);
