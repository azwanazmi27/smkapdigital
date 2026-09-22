# Manual re-entry templates for empty production

Use these fields when rebuilding production content. Do not place passwords, API keys or private file contents in this file.

## Users

`email,name,role,active,modules`

## Leadership / organisation chart

`name,position,grade,sort_order,photo_drive_file_id`

## Public announcements

`title,body,audience,published_at,ends_at,image_drive_file_id`

## School events

`title,event_date,end_date,category,details`

## Drive folders

`module,school_year,folder_id,owner_email`

All imports must be repeatable, preserve supplied IDs where available, reject duplicate emails/file IDs, and produce a count report before any write.
