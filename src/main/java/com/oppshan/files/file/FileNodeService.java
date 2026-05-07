package com.oppshan.files.file;

import com.google.common.io.CountingInputStream;
import com.oppshan.files.exception.BusinessException;
import io.quarkus.narayana.jta.runtime.TransactionConfiguration;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.io.InputStream;
import java.util.List;
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
                                                      @NotNull UUID fileNodeUuid) {
        final var breadcrumbs = fileNodeRepository.getBreadcrumbs(userAccountUuid, fileNodeUuid);
        if (breadcrumbs.isEmpty()) {
            throw BusinessException.directoryNotFound();
        }

        return toDirectoryContentsView(userAccountUuid, breadcrumbs);
    }

    @Valid
    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull String path) {
        path = path.trim();
        if (path.isBlank() || path.equals("/")) {
            return getRootDirectoryContents(userAccountUuid);
        }

        final var breadcrumbs = fileNodeRepository.getBreadcrumbs(userAccountUuid, path);
        if (breadcrumbs.isEmpty()) {
            throw BusinessException.directoryNotFound();
        }

        return toDirectoryContentsView(userAccountUuid, breadcrumbs);
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
    public DirectoryContentsView createDirectoryFileNode(@NotNull UUID userAccountUuid,
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
    @TransactionConfiguration(timeout = 12_000)
    public DirectoryContentsView createRegularFileNode(@NotNull UUID userAccountUuid,
                                                       @NotNull UUID parentUuid,
                                                       @NotNull String filename,
                                                       @NotNull String mimeType,
                                                       @NotNull InputStream contentInputStream) {
        final var name = filename.trim();
        if (name.isEmpty()) {
            throw BusinessException.fileNameRequired();
        }

        final var parentFileNode = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        if (fileNodeRepository.isFilePresent(userAccountUuid, parentUuid, name, mimeType)) {
            throw BusinessException.fileNameNotUnique();
        }

        final var countingInputStream = new CountingInputStream(contentInputStream);
        final var fileNode = new FileNode()
                .setName(name)
                .setMimeType(mimeType)
                .setDirectory(false)
                .setContent(countingInputStream)
                .setParentFileNode(parentFileNode)
                .setUserAccount(parentFileNode.getUserAccount());
        fileNodeRepository.insertWithSession(fileNode);
        parentFileNode.getChildFileNodes().add(fileNode);
        fileNodeRepository.flushWithSession();

        final long counted = countingInputStream.getCount();
        final var userStorageView = fileNodeRepository.getUserStorageView(userAccountUuid)
                .orElseThrow(BusinessException::userNotFound);
        if (counted > userStorageView.maxFileUploadBytes()) {
            throw BusinessException.fileSizeExceeded();
        }

        if (userStorageView.totalSizeBytes() + counted > userStorageView.maxStorageBytes()) {
            throw BusinessException.fileQuotaExceeded();
        }

        fileNode.setSizeBytes(counted);
        fileNodeRepository.flushWithSession();
        final var refreshedParentFileNode = fileNodeRepository.refreshWithSession(parentFileNode);
        return toDirectoryContentsView(userAccountUuid, refreshedParentFileNode);
    }

    @Valid
    @NotNull
    public DirectoryContentsView renameFileNode(@NotNull UUID userAccountUuid,
                                                @NotNull UUID fileNodeUuid,
                                                @NotNull RenameFileNodeRequest renameFileNodeRequest) {
        final var fileNode = fileNodeRepository.findFileNode(userAccountUuid, fileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        final var name = renameFileNodeRequest.name().trim();
        if (name.isEmpty()) {
            throw fileNode.isDirectory()
                    ? BusinessException.folderNameRequired()
                    : BusinessException.fileNameRequired();
        }

        final var parentDirectoryFileNodeUuid = fileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderModificationNotAllowed)
                .getUuid();
        if (fileNode.isDirectory()) {
            if (fileNodeRepository.isDirectoryPresent(userAccountUuid, parentDirectoryFileNodeUuid, name, fileNodeUuid)) {
                throw BusinessException.folderNameNotUnique();
            }
        } else {
            if (fileNodeRepository.isFilePresent(userAccountUuid, parentDirectoryFileNodeUuid, name, fileNode.getMimeType(), fileNodeUuid)) {
                throw BusinessException.fileNameNotUnique();
            }
        }

        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNodeUuid)
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
    public DirectoryContentsView deleteFileNode(@NotNull UUID userAccountUuid,
                                                @NotNull UUID fileNodeUuid) {
        final var fileNode = fileNodeRepository.findFileNode(userAccountUuid, fileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentDirectoryFileNodeUuid = fileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed)
                .getUuid();
        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        parentDirectoryFileNodeWithContents.getChildFileNodes()
                .removeIf(childFileNode -> childFileNode.getUuid().equals(fileNodeUuid));
        return toDirectoryContentsView(userAccountUuid, parentDirectoryFileNodeWithContents);
    }

    @NotNull
    public FileDownloadViewResolver getFileDownloadViewResolver(@NotNull UUID userAccountUuid,
                                                                @NotNull UUID fileUuid) {
        return new FileDownloadViewResolver(
                userAccountUuid,
                fileUuid,
                () -> fileNodeRepository.findRegularFileNode(userAccountUuid, fileUuid)
                        .map(fileNodeRepository::attachWithSession)
                        .orElseThrow(BusinessException::fileNotFound)
        );
    }

    @NotNull
    public FileNodePropertiesView getFileNodeProperties(@NotNull UUID userAccountUuid,
                                                        @NotNull UUID fileNodeUuid) {
        final var fileNode = fileNodeRepository.findFileNode(userAccountUuid, fileNodeUuid)
                .orElseThrow(BusinessException::fileNotFound);
        if (fileNode.isDirectory()) {
            final var directoryStatistics = fileNodeRepository.getDirectoryStatistics(userAccountUuid, fileNodeUuid)
                    .orElse(DirectoryStatistics.empty());
            return new DirectoryPropertiesView(
                    fileNode.getUuid(),
                    fileNode.getName(),
                    fileNode.getCreatedAt(),
                    fileNode.getLastModifiedAt(),
                    directoryStatistics.folderCount(),
                    directoryStatistics.fileCount(),
                    directoryStatistics.totalSizeBytes()
            );
        }

        final var parentDirectoryFileNode = fileNode.getParentFileNode();
        return new RegularFilePropertiesView(
                fileNode.getUuid(),
                fileNode.getName(),
                fileNode.getMimeType(),
                fileNode.getSizeBytes(),
                parentDirectoryFileNode.map(FileNode::getUuid).orElse(null),
                parentDirectoryFileNode.map(FileNode::getName).orElse(null),
                fileNode.getCreatedAt(),
                fileNode.getLastModifiedAt()
        );
    }

    private DirectoryContentsView toDirectoryContentsView(UUID userAccountUuid,
                                                          FileNode directoryFileNode) {
        return directoryFileNode.toDirectoryContentsView(
                fileNodeRepository.getBreadcrumbs(userAccountUuid, directoryFileNode.getUuid())
        );
    }

    private DirectoryContentsView toDirectoryContentsView(UUID userAccountUuid,
                                                          List<BreadcrumbView> breadcrumbs) {
        final var targetBreadcrumb = breadcrumbs.getLast();
        if (targetBreadcrumb.directory()) {
            return fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, targetBreadcrumb.uuid())
                    .orElseThrow(BusinessException::directoryNotFound)
                    .toDirectoryContentsView(breadcrumbs);
        }

        final var parentBreadcrumbs = breadcrumbs.subList(0, breadcrumbs.size() - 1);
        return fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentBreadcrumbs.getLast().uuid())
                .orElseThrow(BusinessException::directoryNotFound)
                .toDirectoryContentsView(parentBreadcrumbs, targetBreadcrumb.uuid());
    }
}
