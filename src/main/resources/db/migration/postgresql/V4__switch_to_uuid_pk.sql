-- =============================================================================
-- V4__switch_to_uuid_pk.sql
-- Switch primary keys from BIGINT uuid to UUID uuid
-- =============================================================================

-- 1. Drop existing Foreign Keys
ALTER TABLE idp_account
    DROP CONSTRAINT fk_idp_account_user;
ALTER TABLE google_account
    DROP CONSTRAINT fk_google_account_idp;
ALTER TABLE file_node
    DROP CONSTRAINT fk_file_node_parent;
ALTER TABLE file_node
    DROP CONSTRAINT fk_file_node_user;
ALTER TABLE user_storage
    DROP CONSTRAINT fk_user_storage_user;
ALTER TABLE user_storage
    DROP CONSTRAINT fk_user_storage_root;

-- 2. Drop existing Primary Keys and Unique Constraints on uuid (uuid will become PK)
ALTER TABLE user_account
    DROP CONSTRAINT pk_user_account;
ALTER TABLE user_account
    DROP CONSTRAINT uc_user_account_uuid;

ALTER TABLE idp_account
    DROP CONSTRAINT pk_idp_account;
ALTER TABLE idp_account
    DROP CONSTRAINT uc_idp_account_uuid;

ALTER TABLE google_account
    DROP CONSTRAINT pk_google_account;

ALTER TABLE file_node
    DROP CONSTRAINT pk_file_node;
ALTER TABLE file_node
    DROP CONSTRAINT uc_file_node_uuid;

ALTER TABLE user_storage
    DROP CONSTRAINT pk_user_storage;
ALTER TABLE user_storage
    DROP CONSTRAINT uc_user_storage_uuid;

-- 3. Rename/Add new FK columns with UUID type and migrate data
-- idp_account
ALTER TABLE idp_account
    RENAME COLUMN user_account_id TO user_account_id_old;
ALTER TABLE idp_account
    ADD COLUMN user_account_uuid UUID;
UPDATE idp_account t
SET user_account_uuid = (SELECT uuid FROM user_account WHERE id = t.user_account_id_old);
ALTER TABLE idp_account
    ALTER COLUMN user_account_uuid SET NOT NULL;

-- google_account
-- uuid was both PK and FK. We need to rename it to drop it later, and add uuid.
ALTER TABLE google_account
    RENAME COLUMN id TO id_old;
ALTER TABLE google_account
    ADD COLUMN uuid UUID;
-- We must join on idp_account using its OLD uuid (which is still there)
UPDATE google_account t
SET uuid = (SELECT uuid FROM idp_account WHERE id = t.id_old);
ALTER TABLE google_account
    ALTER COLUMN uuid SET NOT NULL;

-- file_node
ALTER TABLE file_node
    RENAME COLUMN parent_file_node_id TO parent_file_node_id_old;
ALTER TABLE file_node
    ADD COLUMN parent_file_node_uuid UUID;
-- We must join on file_node using its OLD uuid (which is still there)
UPDATE file_node t
SET parent_file_node_uuid = (SELECT uuid FROM file_node WHERE id = t.parent_file_node_id_old)
WHERE t.parent_file_node_id_old IS NOT NULL;

ALTER TABLE file_node
    RENAME COLUMN user_account_id TO user_account_id_old;
ALTER TABLE file_node
    ADD COLUMN user_account_uuid UUID;
UPDATE file_node t
SET user_account_uuid = (SELECT uuid FROM user_account WHERE id = t.user_account_id_old);
ALTER TABLE file_node
    ALTER COLUMN user_account_uuid SET NOT NULL;

-- user_storage
ALTER TABLE user_storage
    RENAME COLUMN user_account_id TO user_account_id_old;
ALTER TABLE user_storage
    ADD COLUMN user_account_uuid UUID;
UPDATE user_storage t
SET user_account_uuid = (SELECT uuid FROM user_account WHERE id = t.user_account_id_old);
ALTER TABLE user_storage
    ALTER COLUMN user_account_uuid SET NOT NULL;

ALTER TABLE user_storage
    RENAME COLUMN root_file_node_id TO root_file_node_id_old;
ALTER TABLE user_storage
    ADD COLUMN root_file_node_uuid UUID;
UPDATE user_storage t
SET root_file_node_uuid = (SELECT uuid FROM file_node WHERE id = t.root_file_node_id_old);
ALTER TABLE user_storage
    ALTER COLUMN root_file_node_uuid SET NOT NULL;

-- 4. Drop old uuid columns
ALTER TABLE user_account
    DROP COLUMN id;
ALTER TABLE idp_account
    DROP COLUMN id;
ALTER TABLE idp_account
    DROP COLUMN user_account_id_old;
ALTER TABLE google_account
    DROP COLUMN id_old;
ALTER TABLE file_node
    DROP COLUMN id;
ALTER TABLE file_node
    DROP COLUMN parent_file_node_id_old;
ALTER TABLE file_node
    DROP COLUMN user_account_id_old;
ALTER TABLE user_storage
    DROP COLUMN id;
ALTER TABLE user_storage
    DROP COLUMN user_account_id_old;
ALTER TABLE user_storage
    DROP COLUMN root_file_node_id_old;

-- 5. Set uuid as Primary Key
ALTER TABLE user_account
    ADD CONSTRAINT pk_user_account PRIMARY KEY (uuid);
ALTER TABLE idp_account
    ADD CONSTRAINT pk_idp_account PRIMARY KEY (uuid);
ALTER TABLE google_account
    ADD CONSTRAINT pk_google_account PRIMARY KEY (uuid);
ALTER TABLE file_node
    ADD CONSTRAINT pk_file_node PRIMARY KEY (uuid);
ALTER TABLE user_storage
    ADD CONSTRAINT pk_user_storage PRIMARY KEY (uuid);

-- 6. Re-create Foreign Keys
ALTER TABLE idp_account
    ADD CONSTRAINT fk_idp_account_user
        FOREIGN KEY (user_account_uuid) REFERENCES user_account (uuid) ON DELETE CASCADE;

ALTER TABLE google_account
    ADD CONSTRAINT fk_google_account_idp
        FOREIGN KEY (uuid) REFERENCES idp_account (uuid) ON DELETE CASCADE;

ALTER TABLE file_node
    ADD CONSTRAINT fk_file_node_parent
        FOREIGN KEY (parent_file_node_uuid) REFERENCES file_node (uuid) ON DELETE CASCADE;

ALTER TABLE file_node
    ADD CONSTRAINT fk_file_node_user
        FOREIGN KEY (user_account_uuid) REFERENCES user_account (uuid) ON DELETE CASCADE;

ALTER TABLE user_storage
    ADD CONSTRAINT fk_user_storage_user
        FOREIGN KEY (user_account_uuid) REFERENCES user_account (uuid) ON DELETE CASCADE;

ALTER TABLE user_storage
    ADD CONSTRAINT fk_user_storage_root
        FOREIGN KEY (root_file_node_uuid) REFERENCES file_node (uuid) ON DELETE RESTRICT;

-- 7. Drop old sequences
DROP SEQUENCE IF EXISTS user_account_sequence;
DROP SEQUENCE IF EXISTS idp_account_sequence;
DROP SEQUENCE IF EXISTS file_node_sequence;
DROP SEQUENCE IF EXISTS user_storage_sequence;

-- 8. Update Indexes if necessary (some might have been dropped automatically or need update)
-- Most indexes were on columns like created_at, name, etc. but some used user_account_id.
-- file_node indexes:
DROP INDEX IF EXISTS idx_file_node_created_at;
CREATE INDEX idx_file_node_created_at ON file_node (user_account_uuid, created_at, name, mime_type, size_bytes);

DROP INDEX IF EXISTS idx_file_node_last_modified_at;
CREATE INDEX idx_file_node_last_modified_at ON file_node (user_account_uuid, last_modified_at, name, mime_type, size_bytes);

DROP INDEX IF EXISTS idx_file_node_name;
CREATE INDEX idx_file_node_name ON file_node (user_account_uuid, parent_file_node_uuid, name, mime_type,
                                              last_modified_at);

DROP INDEX IF EXISTS idx_file_node_size_bytes;
CREATE INDEX idx_file_node_size_bytes ON file_node (user_account_uuid, parent_file_node_uuid, size_bytes, name, mime_type);
