package com.oppshan.files.file;

import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.user.UserAccountService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

@Transactional
@ApplicationScoped
public class FileNodeService {

    @Inject
    UserAccountService userAccountService;

    @Inject
    FileNodeRepository fileNodeRepository;

    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull JsonWebToken idToken,
                                                      @NotNull UUID directoryUuid) {
        return getDirectoryContents(
                userAccountService.getAuthenticatedUser(idToken).uuid(),
                directoryUuid
        );
    }

    @NotNull
    public DirectoryContentsView getDirectoryContentsByPath(@NotNull JsonWebToken idToken,
                                                            @NotNull String path) {
        final var userAccountView = userAccountService.getAuthenticatedUser(idToken);
        final var userAccountUuid = userAccountView.uuid();
        final var rootUuid = userAccountView.rootFileNodeUuid();
        if (path.isBlank()) {
            return getDirectoryContents(userAccountUuid, rootUuid);
        }

        final var segments = path.split("/");
        var currentUuid = rootUuid;
        for (final var segment : segments) {
            final var child = fileNodeRepository.findDirectoryByParentUuidAndName(userAccountUuid, currentUuid, segment)
                    .orElseThrow(BusinessException::directoryNotFound);
            currentUuid = child.getUuid();
        }

        return getDirectoryContents(userAccountUuid, currentUuid);
    }

    @NotNull
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull UUID directoryUuid) {
        final var directory = fileNodeRepository.findById(directoryUuid)
                .filter(FileNode::isDirectory)
                .filter(node -> node.getUserAccount().getUuid().equals(userAccountUuid))
                .orElseThrow(BusinessException::directoryNotFound);
        final var breadcrumbs = buildBreadcrumbs(directory);
        final var contents = fileNodeRepository.streamByParentUuidAndUserAccountUuid(userAccountUuid, directoryUuid)
                .map(FileNode::toFileNodeView)
                .toList();
        return new DirectoryContentsView(
                directory.getUuid(),
                directory.getName(),
                directory.getParentFileNode() != null ? directory.getParentFileNode().getUuid() : null,
                breadcrumbs,
                contents
        );
    }

    private List<BreadcrumbView> buildBreadcrumbs(FileNode directory) {
        final var breadcrumbs = new LinkedList<BreadcrumbView>();
        var current = directory;
        while (current != null) {
            breadcrumbs.push(new BreadcrumbView(current.getUuid(), current.getName()));
            current = current.getParentFileNode();
        }

        return breadcrumbs;
    }
}
