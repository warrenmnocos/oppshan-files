-- =============================================================================
-- V8__user_account_name_nullable.sql
--
-- Relax columns whose source OIDC claim is OPTIONAL (per OIDC Core 1.0 § 5.1
-- only `sub` is REQUIRED; `name`, `given_name`, `family_name`, `picture`,
-- `email`, ... are all OPTIONAL).
--
-- Trigger: a Google account without a `family_name` claim signed in and the
-- entity-level @NotEmpty + @Column(nullable = false) on UserAccount.lastName
-- blew up at @PrePersist with ConstraintViolationException; the JTA tx
-- rolled back; the OIDC callback returned 500. Existing users were
-- unaffected (the update path only writes a claim when it's non-null).
--
-- Same class of bug applies to:
--   - user_account.first_name (given_name OPTIONAL)
--   - user_account.last_name  (family_name OPTIONAL)
--   - google_account.name     (name OPTIONAL; Google emits in practice)
--   - google_account.photo_url (picture OPTIONAL; missing for picture-less
--     accounts; tightened in V7 -- now relaxed back)
--
-- email is intentionally kept NOT NULL: we request the `email` scope from
-- Google which guarantees the claim, and the field is load-bearing for
-- display when names are absent.
--
-- DROP NOT NULL is idempotent in PostgreSQL.
-- =============================================================================

ALTER TABLE user_account
    ALTER COLUMN first_name DROP NOT NULL,
    ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE google_account
    ALTER COLUMN name DROP NOT NULL,
    ALTER COLUMN photo_url DROP NOT NULL;

-- Promote idx_user_account_first_name / idx_user_account_last_name to composite
-- indexes so a sort that ties on the leading column resolves from the index
-- without a heap fetch (FIRST_NAME comparator chains firstName -> lastName,
-- LAST_NAME comparator chains lastName -> firstName). Idempotent via a definition
-- check: re-running the migration after the composite is in place is a no-op.
DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_indexes
                       WHERE schemaname = 'public'
                         AND indexname = 'idx_user_account_first_name'
                         AND indexdef LIKE '%(first_name, last_name)') THEN
            DROP INDEX IF EXISTS idx_user_account_first_name;
            CREATE INDEX idx_user_account_first_name ON user_account (first_name, last_name);
        END IF;
    END
$$;

DO
$$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_indexes
                       WHERE schemaname = 'public'
                         AND indexname = 'idx_user_account_last_name'
                         AND indexdef LIKE '%(last_name, first_name)') THEN
            DROP INDEX IF EXISTS idx_user_account_last_name;
            CREATE INDEX idx_user_account_last_name ON user_account (last_name, first_name);
        END IF;
    END
$$;
