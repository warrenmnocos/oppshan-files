-- =============================================================================
-- V7__index_idp_fk_and_restore_unique_constraints.sql
--
-- Two related fixes:
--
-- (1) Index idp_account.user_account_uuid. PostgreSQL does not auto-index FK
--     columns; IdpAccountRepository.stream(userAccountUuid) (called from
--     UserAccountService.toUserAccountView on every /api/auth/me round-trip)
--     and the user_account -> idp_account ON DELETE CASCADE walk both filter
--     by user_account_uuid alone. The existing UC has user_account_uuid as
--     its third column, which is unusable for a leading-column lookup.
--
-- (2) Restore three UNIQUE constraints that V4__switch_to_uuid_pk.sql silently
--     dropped. When V4 dropped the *_id_old columns, PostgreSQL cascaded the
--     drop to all same-table constraints involving those columns -- including
--     uc_idp_account_provider, uc_file_node_name, and uc_user_storage_user --
--     because same-table dependencies are dropped implicitly (only external
--     dependencies require explicit CASCADE). V4 only re-added the FKs.
--
--     Before re-adding uc_file_node_name, disambiguate any pre-existing
--     duplicates (race-condition double-uploads that slipped through while
--     the constraint was missing) by suffixing the later row's name with "-N".
-- =============================================================================

-- (1) Cover the FK lookup.
CREATE INDEX IF NOT EXISTS idx_idp_account_user_account_uuid
    ON idp_account (user_account_uuid);

-- (2a) Disambiguate file_node duplicates. The earliest row in each duplicate
-- group keeps its name; later rows get "-1", "-2", ... inserted before the
-- final extension (or appended if the name has no extension).
WITH ranked AS (SELECT uuid,
                       name,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_account_uuid, parent_file_node_uuid, name, mime_type
                           ORDER BY created_at, uuid
                           ) - 1 AS dup_index
                FROM file_node)
UPDATE file_node AS fileNode
SET name = CASE
               WHEN ranked.name ~ '\.[^.]+$'
                   THEN regexp_replace(ranked.name, '(\.[^.]+)$', '-' || ranked.dup_index || '\1')
               ELSE ranked.name || '-' || ranked.dup_index
    END
FROM ranked
WHERE fileNode.uuid = ranked.uuid
  AND ranked.dup_index > 0;

-- (2b) Restore the three UNIQUE constraints. Each ADD is guarded by a
-- pg_constraint lookup so the migration is a no-op when re-applied. (Cannot
-- use EXCEPTION WHEN: PostgreSQL raises 42P07 duplicate_table -- not 42710
-- duplicate_object -- when ALTER TABLE ADD CONSTRAINT collides on a UNIQUE,
-- because the constraint is backed by an index and the name conflict surfaces
-- as a relation conflict.)
DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_constraint
                       WHERE conname = 'uc_file_node_name'
                         AND conrelid = 'file_node'::regclass) THEN
            ALTER TABLE file_node
                ADD CONSTRAINT uc_file_node_name
                    UNIQUE NULLS NOT DISTINCT (user_account_uuid, parent_file_node_uuid, name, mime_type);
        END IF;
    END
$$;

DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_constraint
                       WHERE conname = 'uc_idp_account_provider'
                         AND conrelid = 'idp_account'::regclass) THEN
            ALTER TABLE idp_account
                ADD CONSTRAINT uc_idp_account_provider
                    UNIQUE (provider_id, provider_name, user_account_uuid);
        END IF;
    END
$$;

DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_constraint
                       WHERE conname = 'uc_user_storage_user'
                         AND conrelid = 'user_storage'::regclass) THEN
            ALTER TABLE user_storage
                ADD CONSTRAINT uc_user_storage_user
                    UNIQUE (user_account_uuid);
        END IF;
    END
$$;

-- (3) Tighten google_account.photo_url to NOT NULL. V1 left it nullable, but
-- every code path sets the value and prod data has no nulls. SET NOT NULL is
-- idempotent in PostgreSQL.
ALTER TABLE google_account
    ALTER COLUMN photo_url SET NOT NULL;
