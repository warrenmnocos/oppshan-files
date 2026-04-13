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
}
