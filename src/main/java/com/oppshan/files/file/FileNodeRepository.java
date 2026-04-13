package com.oppshan.files.file;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Query;
import jakarta.data.repository.Repository;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

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
            SELECT fileNode
            FROM FileNode fileNode
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.uuid = :uuid
                AND fileNode.directory = true""")
    Optional<FileNode> findParentFileNode(@NotNull
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
    Optional<FileNode> findParentFileNode(@NotNull
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
    Optional<FileNode> findParentFileNodeWithContents(@NotNull
                                                      UUID userAccountUuid,

                                                      @NotNull
                                                      UUID uuid);

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
