package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.time.Instant;
import java.util.UUID;

@Valid
@RegisterForReflection
public record DirectoryPropertiesView(
        @NotNull
        UUID uuid,

        @NotEmpty
        String name,

        @NotNull
        Instant createdAt,

        @NotNull
        Instant lastModifiedAt,

        @PositiveOrZero
        long directoryCount,

        @PositiveOrZero
        long fileCount,

        @PositiveOrZero
        long totalSizeBytes
) implements FileNodePropertiesView {

    @Serial
    private static final long serialVersionUID = 1L;
}