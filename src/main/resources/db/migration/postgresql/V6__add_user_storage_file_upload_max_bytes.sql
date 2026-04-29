-- =============================================================================
-- V6__add_user_storage_file_upload_max_bytes.sql
-- Per-user file upload size limit stored in user_storage.
-- Default matches app.storage.file-upload-max-bytes (100 MB).
-- =============================================================================

ALTER TABLE user_storage
    ADD COLUMN max_file_upload_bytes BIGINT NOT NULL DEFAULT 104857600;