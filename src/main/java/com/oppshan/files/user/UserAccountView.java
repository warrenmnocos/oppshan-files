package com.oppshan.files.user;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

@Valid
@RegisterForReflection
public record UserAccountView(
        @NotNull
        UUID uuid,

        String firstName,

        String lastName,

        @NotEmpty
        String displayName,

        @NotEmpty
        String email,

        String photoUrl,

        @PositiveOrZero
        long usedStorageBytes,

        @PositiveOrZero
        long maxStorageBytes,

        @PositiveOrZero
        long maxFileUploadBytes,

        UUID rootFileNodeUuid,

        @NotNull
        Instant createdAt,

        @NotNull
        Instant lastModifiedAt
) implements Principal, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private static final UserAccountView anonymous = new UserAccountView(
            UUID.nameUUIDFromBytes("anonymous".getBytes(StandardCharsets.UTF_8)),
            "anonymous",
            "anonymous",
            "anonymous",
            "anonymous",
            "anonymous",
            0,
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

    @Override
    public String getName() {
        return uuid.toString();
    }
}
