-- =============================================================================
-- V1__create_user_tables.sql
-- Sequences, user_account, idp_account, google_account
-- =============================================================================

-- Sequences (allocationSize = 100 in JPA, so INCREMENT must match)
CREATE SEQUENCE user_account_sequence START WITH 1 INCREMENT BY 100;
CREATE SEQUENCE idp_account_sequence START WITH 1 INCREMENT BY 100;

-- -------------------------------------------------------
-- user_account
-- -------------------------------------------------------
CREATE TABLE user_account
(
    id               BIGINT       NOT NULL DEFAULT nextval('user_account_sequence'),
    uuid             UUID         NOT NULL,
    name             VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    last_modified_at TIMESTAMPTZ  NOT NULL,

    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uc_user_account_uuid UNIQUE (uuid)
);

CREATE INDEX idx_user_account_created_at ON user_account (created_at);
CREATE INDEX idx_user_account_name ON user_account (name);

-- -------------------------------------------------------
-- idp_account (base table, JOINED inheritance)
-- -------------------------------------------------------
CREATE TABLE idp_account
(
    id               BIGINT       NOT NULL DEFAULT nextval('idp_account_sequence'),
    uuid             UUID         NOT NULL,
    provider_id      VARCHAR(255) NOT NULL,
    provider_name    VARCHAR(255) NOT NULL,
    user_account_id  BIGINT       NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    last_modified_at TIMESTAMPTZ  NOT NULL,

    CONSTRAINT pk_idp_account PRIMARY KEY (id),
    CONSTRAINT uc_idp_account_uuid UNIQUE (uuid),
    CONSTRAINT uc_idp_account_provider UNIQUE (provider_id, provider_name, user_account_id),
    CONSTRAINT fk_idp_account_user FOREIGN KEY (user_account_id)
        REFERENCES user_account (id) ON DELETE CASCADE
);

CREATE INDEX idx_idp_account_created_at ON idp_account (created_at);

-- -------------------------------------------------------
-- google_account (child table of idp_account)
-- -------------------------------------------------------
CREATE TABLE google_account
(
    id        BIGINT       NOT NULL,
    name      VARCHAR(255) NOT NULL,
    email     VARCHAR(255) NOT NULL,
    photo_url VARCHAR(2048),

    CONSTRAINT pk_google_account PRIMARY KEY (id),
    CONSTRAINT fk_google_account_idp FOREIGN KEY (id)
        REFERENCES idp_account (id) ON DELETE CASCADE
);

CREATE INDEX idx_google_account_name ON google_account (name);
CREATE INDEX idx_google_account_email ON google_account (email);
