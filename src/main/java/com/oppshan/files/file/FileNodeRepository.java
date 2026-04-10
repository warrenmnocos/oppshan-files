package com.oppshan.files.file;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Query;
import jakarta.data.repository.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FileNodeRepository
        extends CrudRepository<FileNode, UUID>, StatefulWriteRepository<FileNode> {

    @Query("SELECT COALESCE(SUM(f.sizeBytes), 0) FROM FileNode f WHERE f.userAccount.uuid = :userAccountUuid AND f.directory = false")
    long sumSizeBytesByUserAccountUuid(UUID userAccountUuid);

    @Query("SELECT COALESCE(SUM(f.sizeBytes), 0) FROM FileNode f WHERE f.directory = false")
    long sumAllSizeBytes();

    @Query("SELECT f FROM FileNode f WHERE f.parentFileNode.uuid = :parentUuid AND f.userAccount.uuid = :userAccountUuid ORDER BY f.directory DESC, f.name ASC")
    List<FileNode> findByParentUuidAndUserAccountUuid(UUID parentUuid, UUID userAccountUuid);
}
