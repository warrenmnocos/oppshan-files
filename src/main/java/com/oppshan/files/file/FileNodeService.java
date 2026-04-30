package com.oppshan.files.file;

import com.google.common.io.CountingInputStream;
import com.oppshan.files.exception.BusinessException;
import io.quarkus.narayana.jta.runtime.TransactionConfiguration;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.jspecify.annotations.NonNull;

import java.io.InputStream;
import java.util.UUID;

@Transactional
@ApplicationScoped
public class FileNodeService {

    private final FileNodeRepository fileNodeRepository;

    @Inject
    public FileNodeService(FileNodeRepository fileNodeRepository) {
        this.fileNodeRepository = fileNodeRepository;
    }

    @Valid
    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull UUID directoryFileNodeUuid) {
        return fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, directoryFileNodeUuid)
                .map(directoryFileNode -> toDirectoryContentsView(userAccountUuid, directoryFileNode))
                .orElseThrow(BusinessException::directoryNotFound);
    }

    @Valid
    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull String path) {
        if (path.isBlank()) {
            return getRootDirectoryContents(userAccountUuid);
        }

        final var targetUuid = fileNodeRepository.resolveDirectoryPath(userAccountUuid, path)
                .orElseThrow(BusinessException::directoryNotFound);
        return getDirectoryContents(userAccountUuid, targetUuid);
    }

    @Valid
    @NotNull
    public DirectoryPropertiesView getDirectoryProperties(@NotNull UUID userAccountUuid,
                                                          @NotNull UUID directoryFileNodeUuid) {
        final var directoryFileNode = fileNodeRepository.findDirectoryFileNode(userAccountUuid, directoryFileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        final var directoryStatistics = fileNodeRepository.getDirectoryStatistics(userAccountUuid, directoryFileNodeUuid)
                .orElse(DirectoryStatistics.empty());
        return new DirectoryPropertiesView(
                directoryFileNode.getUuid(),
                directoryFileNode.getName(),
                directoryFileNode.getCreatedAt(),
                directoryFileNode.getLastModifiedAt(),
                directoryStatistics.folderCount(),
                directoryStatistics.fileCount(),
                directoryStatistics.totalSizeBytes()
        );
    }

    @Valid
    @NotNull
    public DirectoryContentsView getRootDirectoryContents(@NotNull UUID userAccountUuid) {
        return fileNodeRepository.findRootDirectoryFileNodeWithContents(userAccountUuid)
                .map(rootDirectoryFileNode -> toDirectoryContentsView(userAccountUuid, rootDirectoryFileNode))
                .orElseThrow(BusinessException::directoryNotFound);
    }

    @Valid
    @NotNull
    public DirectoryContentsView createDirectory(@NotNull UUID userAccountUuid,
                                                 @NotNull CreateDirectoryRequest request) {
        final var name = request.name().trim();
        if (name.isEmpty()) {
            throw BusinessException.folderNameRequired();
        }

        final var parentFileNode = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, request.parentUuid())
                .orElseThrow(BusinessException::directoryNotFound);
        if (fileNodeRepository.isDirectoryPresent(userAccountUuid, request.parentUuid(), name)) {
            throw BusinessException.folderNameNotUnique();
        }

        final var directoryFileNode = FileNode.createDirectory(parentFileNode, name);
        fileNodeRepository.insertWithSession(directoryFileNode);
        parentFileNode.getChildFileNodes().add(directoryFileNode);
        return toDirectoryContentsView(userAccountUuid, parentFileNode);
    }

    @Valid
    @NotNull
    public DirectoryContentsView renameDirectory(@NotNull UUID userAccountUuid,
                                                 @NotNull UUID parentFileNodeUuid,
                                                 @NotNull RenameFileNodeRequest renameFileNodeRequest) {
        final var name = renameFileNodeRequest.name().trim();
        if (name.isEmpty()) {
            throw BusinessException.folderNameRequired();
        }

        final var directoryFileNode = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentDirectoryFileNode = directoryFileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed);
        if (fileNodeRepository.isDirectoryPresent(userAccountUuid, parentDirectoryFileNode.getUuid(), name, parentFileNodeUuid)) {
            throw BusinessException.folderNameNotUnique();
        }

        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNode.getUuid())
                .orElseThrow(BusinessException::directoryNotFound);
        final var childFileNodes = parentDirectoryFileNodeWithContents.getChildFileNodes();
        childFileNodes.remove(directoryFileNode);
        directoryFileNode.setName(name);
        childFileNodes.add(directoryFileNode);
        fileNodeRepository.updateWithSession(directoryFileNode);
        return toDirectoryContentsView(userAccountUuid, parentDirectoryFileNodeWithContents);
    }

    @Valid
    @NotNull
    public DirectoryContentsView deleteDirectory(@NotNull UUID userAccountUuid,
                                                 @NotNull UUID directoryFileNodeUuid) {
        final var directoryFileNode = fileNodeRepository.findDirectoryFileNode(userAccountUuid, directoryFileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentDirectoryFileNodeUuid = directoryFileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed)
                .getUuid();
        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        parentDirectoryFileNodeWithContents.getChildFileNodes()
                .removeIf(childFileNode -> childFileNode.getUuid().equals(directoryFileNodeUuid));
        return toDirectoryContentsView(userAccountUuid, parentDirectoryFileNodeWithContents);
    }

    @Valid
    @NotNull
    @TransactionConfiguration(timeout = 12_000)
    public DirectoryContentsView uploadFile(@NotNull UUID userAccountUuid,
                                            @NotNull UUID parentUuid,
                                            @NotNull String filename,
                                            @NotNull String mimeType,
                                            @NotNull InputStream bodyStream) {
        final var name = filename.trim();
        if (name.isEmpty()) {
            throw BusinessException.fileNameRequired();
        }

        final var parentFileNode = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        if (fileNodeRepository.isFilePresent(userAccountUuid, parentUuid, name, mimeType)) {
            throw BusinessException.fileNameNotUnique();
        }

        final var countingInputStream = new CountingInputStream(bodyStream);
        final var fileNode = new FileNode()
                .setName(name)
                .setMimeType(mimeType)
                .setDirectory(false)
                .setContent(new IncomingBlob(countingInputStream))
                .setParentFileNode(parentFileNode)
                .setUserAccount(parentFileNode.getUserAccount());
        fileNodeRepository.insertWithSession(fileNode);
        parentFileNode.getChildFileNodes().add(fileNode);
        fileNodeRepository.flushWithSession();

        final long counted = countingInputStream.getCount();
        if (counted > fileNodeRepository.getMaxFileUploadBytes(userAccountUuid)) {
            throw BusinessException.fileSizeExceeded();
        }

        if (fileNodeRepository.getTotalSizeBytes(userAccountUuid) + counted > fileNodeRepository.getMaxStorageBytes(userAccountUuid)) {
            throw BusinessException.fileQuotaExceeded();
        }

        fileNode.setSizeBytes(counted);
        fileNodeRepository.flushWithSession();
        final var refreshedParentFileNode = fileNodeRepository.refreshWithSession(parentFileNode);
        return toDirectoryContentsView(userAccountUuid, refreshedParentFileNode);
    }

    @NotNull
    public FileDownloadViewResolver getFileDownloadViewResolver(@NotNull UUID userAccountUuid,
                                                                @NotNull UUID fileUuid) {
        return new FileDownloadViewResolver(
                userAccountUuid,
                fileUuid,
                () -> fileNodeRepository.findFileNode(userAccountUuid, fileUuid)
                        .map(fileNodeRepository::attachWithSession)
                        .orElseThrow(BusinessException::fileNotFound)
        );
    }

    @Valid
    @NotNull
    public DirectoryContentsView renameFile(@NotNull UUID userAccountUuid,
                                            @NotNull UUID parentFileNodeUuid,
                                            @NotNull RenameFileNodeRequest renameFileNodeRequest) {
        final var name = renameFileNodeRequest.name().trim();
        if (name.isEmpty()) {
            throw BusinessException.fileNameRequired();
        }

        final var fileNode = fileNodeRepository.findFileNode(userAccountUuid, parentFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::fileNotFound);
        final var parentDirectoryFileNode = fileNode.getParentFileNode()
                .orElseThrow(BusinessException::directoryNotFound);
        if (fileNodeRepository.isFilePresent(userAccountUuid, parentDirectoryFileNode.getUuid(), name, fileNode.getMimeType(), parentFileNodeUuid)) {
            throw BusinessException.fileNameNotUnique();
        }

        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNode.getUuid())
                .orElseThrow(BusinessException::directoryNotFound);
        final var childFileNodes = parentDirectoryFileNodeWithContents.getChildFileNodes();
        childFileNodes.remove(fileNode);
        fileNode.setName(name);
        childFileNodes.add(fileNode);
        fileNodeRepository.updateWithSession(fileNode);
        return toDirectoryContentsView(userAccountUuid, parentDirectoryFileNodeWithContents);
    }

    @Valid
    @NotNull
    public DirectoryContentsView deleteFile(@NotNull UUID userAccountUuid,
                                            @NotNull UUID fileUuid) {
        final var fileNode = fileNodeRepository.findFileNode(userAccountUuid, fileUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::fileNotFound);
        final var parentDirectoryFileNode = fileNode.getParentFileNode()
                .orElseThrow(BusinessException::directoryNotFound);
        fileNodeRepository.deleteWithSession(fileNode);

        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNode.getUuid())
                .orElseThrow(BusinessException::directoryNotFound);
        parentDirectoryFileNodeWithContents.getChildFileNodes().remove(fileNode);
        return toDirectoryContentsView(userAccountUuid, parentDirectoryFileNodeWithContents);
    }

    @Valid
    @NotNull
    public FilePropertiesView getFileProperties(@NotNull UUID userAccountUuid,
                                                @NotNull UUID fileUuid) {
        final var fileNode = fileNodeRepository.findFileNode(userAccountUuid, fileUuid)
                .orElseThrow(BusinessException::fileNotFound);
        final var parent = fileNode.getParentFileNode().orElse(null);
        return new FilePropertiesView(
                fileNode.getUuid(),
                fileNode.getName(),
                fileNode.getMimeType(),
                fileNode.getSizeBytes(),
                parent != null ? parent.getUuid() : null,
                parent != null ? parent.getName() : null,
                fileNode.getCreatedAt(),
                fileNode.getLastModifiedAt()
        );
    }

    @Valid
    @NotNull
    public DirectoryContentsView renameFileNode(@NotNull UUID userAccountUuid,
                                                @NotNull UUID parentFileNodeUuid,
                                                @NotNull RenameFileNodeRequest renameFileNodeRequest) {
        final var fileNode = fileNodeRepository.findNode(userAccountUuid, parentFileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        return fileNode.isDirectory()
                ? renameDirectory(userAccountUuid, parentFileNodeUuid, renameFileNodeRequest)
                : renameFile(userAccountUuid, parentFileNodeUuid, renameFileNodeRequest);
    }

    @Valid
    @NotNull
    public DirectoryContentsView deleteFileNode(@NotNull UUID userAccountUuid,
                                                @NotNull UUID fileNodeUuid) {
        final var fileNode = fileNodeRepository.findNode(userAccountUuid, fileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        return fileNode.isDirectory()
                ? deleteDirectory(userAccountUuid, fileNodeUuid)
                : deleteFile(userAccountUuid, fileNodeUuid);
    }

    @NotNull
    public FileNodePropertiesView getFileNodePropertiesView(@NotNull UUID userAccountUuid,
                                                            @NotNull UUID fileNodeUuid) {
        final var fileNode = fileNodeRepository.findNode(userAccountUuid, fileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        return fileNode.isDirectory()
                ? getDirectoryProperties(userAccountUuid, fileNodeUuid)
                : getFileProperties(userAccountUuid, fileNodeUuid);
    }

    @NonNull
    private DirectoryContentsView toDirectoryContentsView(@NonNull UUID userAccountUuid,
                                                          @NonNull FileNode directoryFileNode) {
        return directoryFileNode.toDirectoryContentsView(fileNodeRepository.getAncestors(userAccountUuid, directoryFileNode.getUuid()));
    }
}
