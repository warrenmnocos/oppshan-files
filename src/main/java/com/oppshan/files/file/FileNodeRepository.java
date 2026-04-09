package com.oppshan.files.file;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Repository;

import java.util.UUID;

@Repository
public interface FileNodeRepository
        extends CrudRepository<FileNode, UUID>, StatefulWriteRepository<FileNode> {
}
