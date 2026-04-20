package com.oppshan.files.file;

import com.oppshan.files.exception.BusinessException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.jspecify.annotations.NonNull;

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

        final var directoryFileNode = new FileNode()
                .setName(name)
                .setMimeType("application/vnd.oppshan-files.folder")
                .setDirectory(true)
                .setParentFileNode(parentFileNode)
                .setUserAccount(parentFileNode.getUserAccount());
        fileNodeRepository.insertWithSession(directoryFileNode);
        parentFileNode.getChildFileNodes().add(directoryFileNode);
        return toDirectoryContentsView(userAccountUuid, parentFileNode);
    }

    @Valid
    @NotNull
    public DirectoryContentsView renameDirectory(@NotNull UUID userAccountUuid,
                                                 @NotNull UUID directoryFileNodeUuid,
                                                 @NotNull RenameDirectoryRequest request) {
        final var name = request.name().trim();
        if (name.isEmpty()) {
            throw BusinessException.folderNameRequired();
        }

        final var directoryFileNode = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, directoryFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentDirectoryFileNode = directoryFileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed);
        if (fileNodeRepository.isDirectoryPresent(userAccountUuid, parentDirectoryFileNode.getUuid(), name, directoryFileNodeUuid)) {
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
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentDirectoryFileNode = directoryFileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed);
        fileNodeRepository.deleteWithSession(directoryFileNode);

        final var parentDirectoryFileNodeWithContents = fileNodeRepository.findDirectoryFileNodeWithContents(userAccountUuid, parentDirectoryFileNode.getUuid())
                .orElseThrow(BusinessException::directoryNotFound);
        parentDirectoryFileNodeWithContents.getChildFileNodes().remove(directoryFileNode);
        return toDirectoryContentsView(userAccountUuid, parentDirectoryFileNodeWithContents);
    }

    @NonNull
    private DirectoryContentsView toDirectoryContentsView(@NonNull UUID userAccountUuid,
                                                          @NonNull FileNode directoryFileNode) {
        return directoryFileNode.toDirectoryContentsView(fileNodeRepository.getAncestors(userAccountUuid, directoryFileNode.getUuid()));
    }
}
