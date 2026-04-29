package com.oppshan.files.file;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.time.Instant;
import java.util.UUID;

@Valid
public record FilePropertiesView(
        @NotNull
        UUID uuid,

        @NotEmpty
        String name,

        @NotEmpty
        String mimeType,

        @PositiveOrZero
        long sizeBytes,

        UUID parentUuid,

        String parentName,

        @NotNull
        Instant createdAt,

        @NotNull
        Instant lastModifiedAt
) implements FileNodePropertiesView {

    @Serial
    private static final long serialVersionUID = 1L;
}