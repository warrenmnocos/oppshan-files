package com.oppshan.files.user;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public record UserAccountView(
        UUID id,
        String name,
        long maxStorageBytes,
        Instant createdAt
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
