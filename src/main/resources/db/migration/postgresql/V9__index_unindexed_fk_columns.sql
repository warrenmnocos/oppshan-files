-- =============================================================================
-- V9__index_file_node_parent_fk.sql
--
-- Cover the two FK columns PostgreSQL doesn't auto-index and that aren't
-- otherwise served by an existing index:
--
-- (1) file_node.parent_file_node_uuid -> file_node.uuid (ON DELETE CASCADE
--     self-FK). The four existing composite indexes
--     (idx_file_node_created_at, _last_modified_at, _name, _size_bytes) all
--     lead with user_account_uuid, so they're only usable for child-lookup
--     patterns when user_account_uuid is also constrained in the predicate.
--     A standalone B-tree on just parent_file_node_uuid gives PG a narrow,
--     directly-usable index for:
--     - LEFT JOIN FETCH walks in findDirectoryFileNodeWithContents and
--       findRootDirectoryFileNodeWithContents (Hibernate 6 forbids adding a
--       user_account_uuid filter to a fetch join's ON clause, so the
--       composite indexes aren't reachable for the join target)
--     - The ON DELETE CASCADE walk when a subtree is removed.
--
-- (2) user_storage.root_file_node_uuid -> file_node.uuid (ON DELETE RESTRICT).
--     Every file_node delete triggers an FK-enforcement check that scans
--     user_storage looking for matching root_file_node_uuid; without an
--     index that's a seq scan. The index also serves the recursive
--     path-resolution CTE in GET_BREADCRUMBS_BY_PATH which joins
--     `user_storage us ON us.root_file_node_uuid = fn.uuid`.
--
-- Both indexes are additive; the existing composites keep their roles.
-- file_node.user_account_uuid is left uncovered by a dedicated single-column
-- index because the four composite indexes leading with it already serve
-- ON DELETE CASCADE walks and tenant-scoped lookups.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_file_node_parent
    ON file_node (parent_file_node_uuid);

CREATE INDEX IF NOT EXISTS idx_user_storage_root_file_node
    ON user_storage (root_file_node_uuid);
