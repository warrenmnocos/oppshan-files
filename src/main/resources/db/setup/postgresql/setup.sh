#!/usr/bin/env bash
# =============================================================================
# PostgreSQL 18 Setup for Oppshan Files
# Run as root or with sudo on Ubuntu 24.04
# =============================================================================
set -euo pipefail

# -----------------------------------------------------------
# 1. Install PostgreSQL 18 from official PGDG repository
# -----------------------------------------------------------
sudo apt update
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install -y postgresql-18

systemctl enable postgresql
systemctl start postgresql

# -----------------------------------------------------------
# 2. Set server timezone to UTC
# -----------------------------------------------------------
PG_CONF="/etc/postgresql/18/main/postgresql.conf"

# Force UTC at the server level — all sessions inherit this
sudo -u postgres psql -c "ALTER SYSTEM SET timezone = 'UTC';"
sudo -u postgres psql -c "ALTER SYSTEM SET log_timezone = 'UTC';"
sudo systemctl restart postgresql

echo "PostgreSQL timezone set to UTC."

# -----------------------------------------------------------
# 3. Create the application database and roles
# -----------------------------------------------------------

# Generate a random password (replace this with your own secret in production)
APP_PASSWORD="${APP_DB_PASSWORD:-$(openssl rand -base64 24)}"
echo "=============================================="
echo "  Generated app password: ${APP_PASSWORD}"
echo "  Save this securely — it will not be shown again."
echo "=============================================="

sudo -u postgres psql <<SQL
-- 1. Create the application database
DROP DATABASE IF EXISTS oppshan_files;
CREATE DATABASE oppshan_files
    ENCODING 'UTF8'
    LC_COLLATE 'en_US.UTF-8'
    LC_CTYPE 'en_US.UTF-8'
    TEMPLATE template0;

-- 2. Force UTC on the database itself (belt and suspenders)
ALTER DATABASE oppshan_files SET timezone = 'UTC';

-- 3. Create the application role (least privilege)
--    NOSUPERUSER  — cannot bypass access checks
--    NOCREATEDB   — cannot create databases
--    NOCREATEROLE — cannot create other roles
--    LOGIN        — can authenticate via JDBC
DROP ROLE IF EXISTS oppshan_files_app;
CREATE ROLE oppshan_files_app
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    LOGIN
    PASSWORD '${APP_PASSWORD}';

-- 4. Grant connect privilege
GRANT CONNECT ON DATABASE oppshan_files TO oppshan_files_app;

-- 5. Connect to the database and set up schema permissions
\connect oppshan_files

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO oppshan_files_app;

-- Allow creating tables, sequences, functions (needed by Flyway migrations)
GRANT CREATE ON SCHEMA public TO oppshan_files_app;

-- Grant all on future tables and sequences created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oppshan_files_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO oppshan_files_app;
SQL

echo ""
echo "=============================================="
echo "  Setup complete!"
echo "  Database:  oppshan_files"
echo "  Role:      oppshan_files_app"
echo "  Password:  ${APP_PASSWORD}"
echo ""
echo "  JDBC URL:"
echo "  jdbc:postgresql://localhost:5432/oppshan_files?options=-c%20timezone%3DUTC&currentSchema=public&binaryTransfer=true&prepareThreshold=5&ApplicationName=oppshan-files"
echo "=============================================="