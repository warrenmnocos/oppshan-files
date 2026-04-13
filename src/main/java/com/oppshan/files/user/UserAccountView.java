package com.oppshan.files.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Valid
public record UserAccountView(
        @NotNull
        UUID uuid,

        @NotEmpty
        String firstName,

        @NotEmpty
        String lastName,

        @NotEmpty
        String email,

        String photoUrl,

        @PositiveOrZero
        long usedStorageBytes,

        @PositiveOrZero
        long maxStorageBytes,

        UUID rootFileNodeUuid,

        @NotNull
        Instant createdAt,

        @NotNull
        Instant lastModifiedAt
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private static final UserAccountView anonymous = new UserAccountView(
            UUID.nameUUIDFromBytes("anonymous".getBytes(StandardCharsets.UTF_8)),
            "anonymous",
            "anonymous",
            "anonymous",
            "anonymous",
            0,
            0,
            UUID.nameUUIDFromBytes("anonymous".getBytes(StandardCharsets.UTF_8)),
            Instant.now(),
            Instant.now()
    );

    public static UserAccountView anonymous() {
        return anonymous;
    }

    public boolean isAnonymous() {
        return this == anonymous;
    }
}
