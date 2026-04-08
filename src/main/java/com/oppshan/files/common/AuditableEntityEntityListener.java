package com.oppshan.files.common;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;
import java.util.UUID;

@ApplicationScoped
public class AuditableEntityEntityListener {

    @PrePersist
    public void onPrePersist(Object object) {
        if (!(object instanceof AuditableEntity<?> auditableEntity)) {
            return;
        }

        auditableEntity.setUuid(UUID.randomUUID());

        final var now = Instant.now();
        auditableEntity.setCreatedAt(now);
        auditableEntity.setLastModifiedAt(now);
    }

    @PreUpdate
    public void onPreUpdate(Object object) {
        if (!(object instanceof AuditableEntity<?> auditableEntity)) {
            return;
        }

        auditableEntity.setLastModifiedAt(Instant.now());
    }
}
