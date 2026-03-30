package com.oppshan.files.user;

import java.time.Instant;
import java.util.UUID;

public record UserAccountView(
        UUID id,
        String name,
        Long maxStorageBytes,
        Instant createdAt
) {
    public static UserAccountView from(UserAccount user) {
        return new UserAccountView(
                user.getId(),
                user.getName(),
                user.getMaxStorageBytes(),
                user.getCreatedAt()
        );
    }
}
