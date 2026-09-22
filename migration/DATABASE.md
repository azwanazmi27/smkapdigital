# Database inspection baseline

These are observed bounded captures, not a transactionally consistent SQL backup. No destination exists for reconciliation. All migration statuses remain BLOCKED.

| Table | Rows captured | Reader capture | Reconciliation |
|---|---:|---|---|
| absence_reason_settings | 1 | No truncation reported | BLOCKED |
| absence_reasons | 9 | No truncation reported | BLOCKED |
| absences | 31 | No truncation reported | BLOCKED |
| admin_module_permissions | 3 | No truncation reported | BLOCKED |
| ai_daily_usage | 7 | No truncation reported | BLOCKED |
| document_drafts | 5 | TRUNCATED / INCOMPLETE | BLOCKED |
| document_mapping_rules | 0 | No truncation reported | BLOCKED |
| admin_audit_logs | 131 | No truncation reported | BLOCKED |
| document_versions | 56 | No truncation reported | BLOCKED |
| documents | 56 | No truncation reported | BLOCKED |
| management_materials | 25 | No truncation reported | BLOCKED |
| document_mappings | 142 | No truncation reported | BLOCKED |
| ekunjung_records | 21 | No truncation reported | BLOCKED |
| management_report_folders | 2 | No truncation reported | BLOCKED |
| opr_intake_metadata | 22 | No truncation reported | BLOCKED |
| opr_duty_reports | 12 | No truncation reported | BLOCKED |
| portal_calendar | 0 | No truncation reported | BLOCKED |
| portal_announcements | 3 | No truncation reported | BLOCKED |
| portal_profiles | 12 | No truncation reported | BLOCKED |
| portal_settings | 22 | No truncation reported | BLOCKED |
| opr_reports | 60 | No truncation reported | BLOCKED |
| programme_documents | 0 | No truncation reported | BLOCKED |
| portal_sessions | 79 | No truncation reported | BLOCKED |
| programmes | 0 | No truncation reported | BLOCKED |
| portal_users | 62 | No truncation reported | BLOCKED |
| push_notifications | 12 | No truncation reported | BLOCKED |
| relief_plans | 9 | TRUNCATED / INCOMPLETE | BLOCKED |
| push_subscriptions | 12 | No truncation reported | BLOCKED |
| relief_settings | 1 | No truncation reported | BLOCKED |
| relief_schedules | 3 | TRUNCATED / INCOMPLETE | BLOCKED |
| school_document_identity | 0 | No truncation reported | BLOCKED |
| skas_evidence | 29 | No truncation reported | BLOCKED |
| relief_teacher_review | 55 | No truncation reported | BLOCKED |
| skas_mapping_rules | 0 | No truncation reported | BLOCKED |
| skas_years | 2 | No truncation reported | BLOCKED |
| staff_portfolio | 4 | No truncation reported | BLOCKED |
| staff_task_state | 7 | No truncation reported | BLOCKED |
| staff_relief_links | 5 | No truncation reported | BLOCKED |
| staff_work_assignments | 21 | No truncation reported | BLOCKED |
| staff_work_documents | 2 | TRUNCATED / INCOMPLETE | BLOCKED |
| teachers | 63 | No truncation reported | BLOCKED |
