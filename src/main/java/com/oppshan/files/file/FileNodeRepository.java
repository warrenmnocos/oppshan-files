package com.oppshan.files.file;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Query;
import jakarta.data.repository.Repository;

import java.util.UUID;

@Repository
public interface FileNodeRepository
        extends CrudRepository<FileNode, UUID>, StatefulWriteRepository<FileNode> {

    @Query("SELECT COALESCE(SUM(f.sizeBytes), 0) FROM FileNode f WHERE f.userAccount.uuid = :userAccountUuid AND f.directory = false")
    long sumSizeBytesByUserAccountUuid(UUID userAccountUuid);
}
