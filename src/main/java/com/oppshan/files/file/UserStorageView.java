package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

@Valid
@RegisterForReflection
public record UserStorageView(
        @NotNull
        UUID userAccountUuid,

        @PositiveOrZero
        long maxFileUploadBytes,

        @PositiveOrZero
        long maxStorageBytes,

        @PositiveOrZero
        long totalSizeBytes
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
