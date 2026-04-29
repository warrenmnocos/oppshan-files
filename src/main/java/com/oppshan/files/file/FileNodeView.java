package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Valid
@RegisterForReflection
public record FileNodeView(
        @NotNull
        UUID uuid,

        @NotEmpty
        String name,

        @NotEmpty
        String mimeType,

        boolean directory,

        @PositiveOrZero
        long sizeBytes,

        UUID parentUuid,

        @NotNull
        Instant createdAt,

        @NotNull
        Instant lastModifiedAt
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
