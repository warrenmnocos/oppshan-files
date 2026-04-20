package com.oppshan.files.file;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Query;
import jakarta.data.repository.Repository;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.persistence.EntityManager;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Repository
public interface FileNodeRepository
        extends CrudRepository<FileNode, UUID>, StatefulWriteRepository<FileNode> {

    @Query("""
            SELECT COALESCE(SUM(fileNode.sizeBytes), 0)
            FROM FileNode fileNode
            WHERE fileNode.directory = false""")
    long getTotalSizeBytes();

    @Query("""
            SELECT COALESCE(SUM(fileNode.sizeBytes), 0)
            FROM FileNode fileNode
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.directory = false""")
    long getTotalSizeBytes(@NotNull
                           UUID userAccountUuid);

    @Query("""
            SELECT COUNT(fileNode) > 0
            FROM FileNode fileNode
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.parentFileNode.uuid = :parentFileNodeUuid
                AND fileNode.name = :name
                AND fileNode.directory = true""")
    boolean isDirectoryPresent(@NotNull
                               UUID userAccountUuid,

                               @NotNull
                               UUID parentFileNodeUuid,

                               @NotEmpty
                               String name);

    @Query("""
            SELECT COUNT(fileNode) > 0
            FROM FileNode fileNode
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.parentFileNode.uuid = :parentFileNodeUuid
                AND fileNode.name = :name
                AND fileNode.directory = true
                AND fileNode.uuid != :excludeUuid""")
    boolean isDirectoryPresent(@NotNull
                               UUID userAccountUuid,

                               @NotNull
                               UUID parentFileNodeUuid,

                               @NotEmpty
                               String name,

                               @NotNull
                               UUID excludeUuid);

    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.uuid = :uuid
                AND fileNode.directory = true""")
    @NotNull
    Optional<FileNode> findDirectoryFileNode(@NotNull
                                             UUID userAccountUuid,

                                             @NotNull
                                             UUID uuid);

    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.parentFileNode.uuid = :parentFileNodeUuid
                AND fileNode.name = :name
                AND fileNode.directory = true""")
    @NotNull
    Optional<FileNode> findDirectoryFileNode(@NotNull
                                             UUID userAccountUuid,

                                             @NotNull
                                             UUID parentFileNodeUuid,

                                             @NotEmpty
                                             String name);

    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            LEFT JOIN FETCH fileNode.childFileNodes
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.uuid = :uuid
                AND fileNode.directory = true""")
    @NotNull
    Optional<FileNode> findDirectoryFileNodeWithContents(@NotNull
                                                         UUID userAccountUuid,

                                                         @NotNull
                                                         UUID uuid);

    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            LEFT JOIN FETCH fileNode.childFileNodes
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.parentFileNode IS NULL
                AND fileNode.directory = true""")
    @NotNull
    Optional<FileNode> findRootDirectoryFileNodeWithContents(@NotNull
                                                             UUID userAccountUuid);

    @NotNull
    default Optional<DirectoryStatistics> getDirectoryStatistics(@NotNull UUID userAccountUuid,
                                                                 @NotNull UUID fileNodeDirectoryUuid) {
        return Optional.ofNullable(
                CDI.current().select(EntityManager.class).get()
                        .createNamedQuery(FileNode.GET_DIRECTORY_STATISTICS, DirectoryStatistics.class)
                        .setParameter("userAccountUuid", userAccountUuid)
                        .setParameter("fileNodeDirectoryUuid", fileNodeDirectoryUuid)
                        .getSingleResultOrNull()
        );
    }

    @NotNull
    default List<BreadcrumbView> getAncestors(@NotNull UUID userAccountUuid,
                                              @NotNull UUID fileNodeUuid) {
        return CDI.current().select(EntityManager.class).get()
                .createNamedQuery(FileNode.GET_ANCESTORS, BreadcrumbView.class)
                .setParameter("userAccountUuid", userAccountUuid)
                .setParameter("fileNodeUuid", fileNodeUuid)
                .getResultList();
    }

    @NotNull
    default Optional<UUID> resolveDirectoryPath(@NotNull UUID userAccountUuid,
                                                @NotNull String path) {
        return Optional.ofNullable(
                CDI.current().select(EntityManager.class).get()
                        .createNamedQuery(FileNode.RESOLVE_DIRECTORY_PATH, UUID.class)
                        .setParameter("userAccountUuid", userAccountUuid)
                        .setParameter("path", path)
                        .getSingleResultOrNull()
        );
    }

    @Query("""
            SELECT userStorage.rootFileNode.uuid
            FROM UserStorage userStorage
            WHERE userStorage.userAccount.uuid = :userAccountUuid""")
    @NotNull
    Optional<UUID> findRootFileNodeUuid(@NotNull
                                        UUID userAccountUuid);

    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            WHERE fileNode.parentFileNode.uuid = :parentFileNodeUuid
                AND fileNode.userAccount.uuid = :userAccountUuid
            ORDER BY fileNode.directory DESC, fileNode.name ASC""")
    @NotNull
    Stream<FileNode> stream(@NotNull
                            UUID userAccountUuid,

                            @NotNull
                            UUID parentFileNodeUuid);
}
