package com.oppshan.files.file;

import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.user.UserAccountService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

@Transactional
@ApplicationScoped
public class FileNodeService {

    private final UserAccountService userAccountService;

    private final FileNodeRepository fileNodeRepository;

    @Inject
    public FileNodeService(UserAccountService userAccountService,
                           FileNodeRepository fileNodeRepository) {
        this.userAccountService = userAccountService;
        this.fileNodeRepository = fileNodeRepository;
    }

    @Valid
    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull UUID directoryFileNodeUuid) {
        return fileNodeRepository.findParentFileNodeWithContents(userAccountUuid, directoryFileNodeUuid)
                .orElseThrow(BusinessException::directoryNotFound)
                .toDirectoryContentsView();
    }

    @Valid
    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull String path) {
        final var userAccountView = userAccountService.getUserAccount(userAccountUuid);
        final var rootFileNodeUuid = userAccountView.rootFileNodeUuid();
        if (path.isBlank()) {
            return getDirectoryContents(userAccountUuid, rootFileNodeUuid);
        }

        final var segments = path.split("/");
        var currentUuid = rootFileNodeUuid;
        for (final var segment : segments) {
            final var child = fileNodeRepository.findParentFileNode(userAccountUuid, currentUuid, segment)
                    .orElseThrow(BusinessException::directoryNotFound);
            currentUuid = child.getUuid();
        }

        return getDirectoryContents(userAccountUuid, currentUuid);
    }

    @Valid
    @NotNull
    public DirectoryPropertiesView getDirectoryProperties(@NotNull UUID userAccountUuid,
                                                          @NotNull UUID directoryFileNodeUuid) {
        final var directoryFileNode = fileNodeRepository.findParentFileNode(userAccountUuid, directoryFileNodeUuid)
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
    public DirectoryContentsView createDirectory(@NotNull UUID userAccountUuid,
                                                 @NotNull CreateDirectoryRequest request) {
        final var name = request.name().trim();
        if (name.isEmpty()) {
            throw BusinessException.folderNameRequired();
        }

        final var parentFileNode = fileNodeRepository.findParentFileNodeWithContents(userAccountUuid, request.parentUuid())
                .orElseThrow(BusinessException::directoryNotFound);
        if (fileNodeRepository.isDirectoryPresent(userAccountUuid, request.parentUuid(), name)) {
            throw BusinessException.folderNameNotUnique();
        }

        final var directory = new FileNode()
                .setName(name)
                .setMimeType("application/vnd.oppshan-files.folder")
                .setDirectory(true)
                .setParentFileNode(parentFileNode)
                .setUserAccount(parentFileNode.getUserAccount());

        fileNodeRepository.insertWithSession(directory);

        parentFileNode.getChildFileNodes().add(directory);

        return parentFileNode.toDirectoryContentsView();
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

        final var directoryFileNode = fileNodeRepository.findParentFileNodeWithContents(userAccountUuid, directoryFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentFileNode = directoryFileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed);
        if (fileNodeRepository.isDirectoryPresent(userAccountUuid, parentFileNode.getUuid(), name, directoryFileNodeUuid)) {
            throw BusinessException.folderNameNotUnique();
        }

        final var parentWithContents = fileNodeRepository.findParentFileNodeWithContents(userAccountUuid, parentFileNode.getUuid())
                .orElseThrow(BusinessException::directoryNotFound);

        parentWithContents.getChildFileNodes().remove(directoryFileNode);
        directoryFileNode.setName(name);
        parentWithContents.getChildFileNodes().add(directoryFileNode);

        fileNodeRepository.updateWithSession(directoryFileNode);

        return parentWithContents.toDirectoryContentsView();
    }

    @Valid
    @NotNull
    public DirectoryContentsView deleteDirectory(@NotNull UUID userAccountUuid,
                                                 @NotNull UUID directoryFileNodeUuid) {
        final var directoryFileNode = fileNodeRepository.findParentFileNodeWithContents(userAccountUuid, directoryFileNodeUuid)
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        final var parentFileNode = directoryFileNode.getParentFileNode()
                .orElseThrow(BusinessException::rootFolderDeletionNotAllowed);
        final var parentWithContents = fileNodeRepository.findParentFileNodeWithContents(userAccountUuid, parentFileNode.getUuid())
                .map(fileNodeRepository::attachWithSession)
                .orElseThrow(BusinessException::directoryNotFound);
        parentWithContents.getChildFileNodes().remove(directoryFileNode);
        return parentWithContents.toDirectoryContentsView();
    }
}
