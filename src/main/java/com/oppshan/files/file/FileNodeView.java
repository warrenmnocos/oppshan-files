package com.oppshan.files.file;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record FileNodeView(
        UUID uuid,
        String name,
        String mimeType,
        boolean directory,
        long sizeBytes,
        UUID parentUuid,
        Instant createdAt,
        Instant lastModifiedAt
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
