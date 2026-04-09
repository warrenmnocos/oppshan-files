-- =============================================================================
-- V3__fix_file_node_unique_constraint.sql
-- Fix the unique constraint column order on file_node
-- =============================================================================

ALTER TABLE file_node
    DROP CONSTRAINT uc_file_node_name;

ALTER TABLE file_node
    ADD CONSTRAINT uc_file_node_name
        UNIQUE NULLS NOT DISTINCT (user_account_id, parent_file_node_id, name, mime_type);