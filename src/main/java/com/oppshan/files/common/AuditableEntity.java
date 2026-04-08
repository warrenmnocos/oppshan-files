package com.oppshan.files.common;

import java.time.Instant;
import java.util.UUID;

public interface AuditableEntity<T extends AuditableEntity<T>> {

    UUID getUuid();

    T setUuid(UUID uuid);

    Instant getCreatedAt();

    T setCreatedAt(Instant createdAt);

    Instant getLastModifiedAt();

    T setLastModifiedAt(Instant lastModifiedAt);
}
