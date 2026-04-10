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
            WHERE fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.directory = false""")
    long sumSizeBytesByUserAccountUuid(@NotNull UUID userAccountUuid);

    @Query("""
            SELECT COALESCE(SUM(fileNode.sizeBytes), 0)
            FROM FileNode fileNode
            WHERE fileNode.directory = false""")
    long sumAllSizeBytes();

    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            WHERE fileNode.parentFileNode.uuid = :parentUuid
                AND fileNode.name = :name
                AND fileNode.userAccount.uuid = :userAccountUuid
                AND fileNode.directory = true""")
    Optional<FileNode> findDirectoryByParentUuidAndName(@NotNull UUID userAccountUuid,
                                                        @NotNull UUID parentUuid,
                                                        @NotEmpty String name);

    @NotNull
    @Query("""
            SELECT fileNode
            FROM FileNode fileNode
            WHERE fileNode.parentFileNode.uuid = :parentUuid
                AND fileNode.userAccount.uuid = :userAccountUuid
            ORDER BY fileNode.directory DESC, fileNode.name ASC""")
    Stream<FileNode> streamByParentUuidAndUserAccountUuid(@NotNull UUID userAccountUuid,
                                                          @NotNull UUID parentUuid);
}
