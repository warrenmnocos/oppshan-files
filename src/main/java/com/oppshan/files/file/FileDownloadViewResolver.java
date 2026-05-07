package com.oppshan.files.file;

import com.oppshan.files.exception.BusinessException;
import jakarta.validation.constraints.NotNull;
import org.jspecify.annotations.NonNull;

import java.util.UUID;
import java.util.function.Supplier;

public final class FileDownloadViewResolver {

    private final UUID userAccountUuid;

    private final UUID fileNodeUuid;

    private final Supplier<FileNode> fileNodeSupplier;

    public FileDownloadViewResolver(@NonNull
                                    UUID userAccountUuid,

                                    @NonNull
                                    UUID fileNodeUuid,

                                    @NonNull
                                    Supplier<FileNode> fileNodeSupplier) {
        this.userAccountUuid = userAccountUuid;
        this.fileNodeUuid = fileNodeUuid;
        this.fileNodeSupplier = fileNodeSupplier;
    }

    @NonNull
    public UUID getUserAccountUuid() {
        return userAccountUuid;
    }

    @NonNull
    public UUID getFileNodeUuid() {
        return fileNodeUuid;
    }

    @NotNull
    public FileNode getFileNode() {
        return fileNodeSupplier.get();
    }

    @NotNull
    public FileDownloadView getFileDownloadView() {
        final var fileNode = getFileNode();
        final var fileNodeContent = fileNode.getContent()
                .orElseThrow(BusinessException::fileNotFound);

        try {
            final var contentInputStream = fileNodeContent.getBinaryStream();
            return new FileDownloadView(
                    userAccountUuid,
                    fileNodeUuid,
                    fileNode.getName(),
                    fileNode.getMimeType(),
                    fileNode.getSizeBytes(),
                    contentInputStream
            );
        } catch (Exception ex) {
            throw BusinessException.fileDownloadFailed(ex);
        }
    }
}
