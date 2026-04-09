-- =============================================================================
-- V5__add_user_names.sql
-- Add first_name and last_name to user_account
-- =============================================================================

ALTER TABLE user_account
    ADD COLUMN first_name VARCHAR(255),
    ADD COLUMN last_name  VARCHAR(255);

-- Populate first_name and last_name from name if they are null
-- A simple split might be too naive, but for existing data we can try to take first word as firstName and the rest as lastName
UPDATE user_account
SET first_name = split_part(name, ' ', 1),
    last_name  = CASE
                     WHEN strpos(name, ' ') = 0 THEN ' '
                     ELSE substr(name, strpos(name, ' ') + 1)
        END
WHERE (first_name IS NULL OR last_name IS NULL)
  AND name IS NOT NULL;

ALTER TABLE user_account
    ALTER COLUMN first_name SET NOT NULL,
    ALTER COLUMN last_name SET NOT NULL;

DROP INDEX IF EXISTS idx_user_account_name;
ALTER TABLE user_account
    DROP COLUMN name;

CREATE INDEX idx_user_account_first_name ON user_account (first_name);
CREATE INDEX idx_user_account_last_name ON user_account (last_name);
