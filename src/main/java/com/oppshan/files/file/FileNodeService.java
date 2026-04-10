package com.oppshan.files.file;

import com.oppshan.files.exception.MessageCode;
import com.oppshan.files.exception.ResourceNotFoundException;
import com.oppshan.files.user.UserAccountService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.ArrayList;
import java.util.Collections;
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
    public DirectoryContentsView getDirectoryContents(@NotNull UUID userAccountUuid,
                                                      @NotNull UUID directoryUuid) {
        final var directory = fileNodeRepository.findById(directoryUuid)
                .filter(FileNode::isDirectory)
                .filter(node -> node.getUserAccount().getUuid().equals(userAccountUuid))
                .orElseThrow(() -> new ResourceNotFoundException(MessageCode.DIRECTORY_NOT_FOUND));
        final var breadcrumbs = buildBreadcrumbs(directory);
        final var contents = fileNodeRepository.findByParentUuidAndUserAccountUuid(directoryUuid, userAccountUuid)
                .stream()
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
        final var breadcrumbs = new ArrayList<BreadcrumbView>();
        var current = directory;
        while (current != null) {
            breadcrumbs.add(new BreadcrumbView(current.getUuid(), current.getName()));
            current = current.getParentFileNode();
        }

        Collections.reverse(breadcrumbs);
        return breadcrumbs;
    }
}
