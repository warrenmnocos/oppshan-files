-- =============================================================================
-- V2__create_file_tables.sql
-- file_node, user_storage, and Large Object cleanup trigger
-- =============================================================================

CREATE SEQUENCE file_node_sequence START WITH 1 INCREMENT BY 100;
CREATE SEQUENCE user_storage_sequence START WITH 1 INCREMENT BY 100;

-- -------------------------------------------------------
-- file_node (unified inode-style entity)
-- -------------------------------------------------------
CREATE TABLE file_node
(
    id                  BIGINT       NOT NULL DEFAULT nextval('file_node_sequence'),
    uuid                UUID         NOT NULL,
    name                VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(255) NOT NULL,
    directory           BOOLEAN      NOT NULL DEFAULT FALSE,
    size_bytes          BIGINT       NOT NULL DEFAULT 0,
    content             OID,    -- Large Object reference; NULL for directories
    parent_file_node_id BIGINT, -- NULL for root nodes
    user_account_id     BIGINT       NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL,
    last_modified_at    TIMESTAMPTZ  NOT NULL,

    CONSTRAINT pk_file_node PRIMARY KEY (id),
    CONSTRAINT uc_file_node_uuid UNIQUE (uuid),
    CONSTRAINT fk_file_node_parent FOREIGN KEY (parent_file_node_id)
        REFERENCES file_node (id) ON DELETE CASCADE,
    CONSTRAINT fk_file_node_user FOREIGN KEY (user_account_id)
        REFERENCES user_account (id) ON DELETE CASCADE,

    -- Prevent duplicate names within the same directory.
    -- NULLS NOT DISTINCT (PG 15+) ensures uniqueness even when parent is NULL (root nodes).
    CONSTRAINT uc_file_node_name UNIQUE NULLS NOT DISTINCT (parent_file_node_id, name, mime_type),

    -- Directories must not have content; files must have content
    CONSTRAINT chk_file_node_content CHECK (
        (directory = TRUE AND content IS NULL AND size_bytes = 0)
            OR
        (directory = FALSE AND content IS NOT NULL)
        )
);

-- Covering indexes for common list queries (sorted by different columns)
CREATE INDEX idx_file_node_created_at
    ON file_node (user_account_id, created_at, name, mime_type, size_bytes);

CREATE INDEX idx_file_node_last_modified_at
    ON file_node (user_account_id, last_modified_at, name, mime_type, size_bytes);

CREATE INDEX idx_file_node_name
    ON file_node (user_account_id, parent_file_node_id, name, mime_type, last_modified_at);

CREATE INDEX idx_file_node_size_bytes
    ON file_node (user_account_id, parent_file_node_id, size_bytes, name, mime_type);

-- -------------------------------------------------------
-- user_storage (per-user quota)
-- -------------------------------------------------------
CREATE TABLE user_storage
(
    id                BIGINT      NOT NULL DEFAULT nextval('user_storage_sequence'),
    uuid              UUID        NOT NULL,
    user_account_id   BIGINT      NOT NULL,
    max_storage_bytes BIGINT      NOT NULL,
    root_file_node_id BIGINT      NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL,
    last_modified_at  TIMESTAMPTZ NOT NULL,

    CONSTRAINT pk_user_storage PRIMARY KEY (id),
    CONSTRAINT uc_user_storage_uuid UNIQUE (uuid),
    CONSTRAINT uc_user_storage_user UNIQUE (user_account_id),
    CONSTRAINT fk_user_storage_user FOREIGN KEY (user_account_id)
        REFERENCES user_account (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_storage_root FOREIGN KEY (root_file_node_id)
        REFERENCES file_node (id) ON DELETE RESTRICT
);

-- -------------------------------------------------------
-- Trigger: clean up Large Objects on file_node DELETE
-- Replaces the lo_manage extension with a custom trigger
-- so we don't need superuser to install extensions.
-- -------------------------------------------------------
CREATE
OR REPLACE FUNCTION delete_file_lob()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only unlink if the row had a Large Object reference
    IF
OLD.content IS NOT NULL THEN
        PERFORM lo_unlink(OLD.content);
END IF;
RETURN OLD;
END;
$$;

CREATE TRIGGER trg_delete_file_lob
    BEFORE DELETE
    ON file_node
    FOR EACH ROW
    EXECUTE FUNCTION delete_file_lob();
