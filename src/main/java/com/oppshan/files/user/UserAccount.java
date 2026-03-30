package com.oppshan.files.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_account",
        indexes = {
                @Index(name = "idx_instance_created_at", columnList = "created_at"),
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uc_user_account_id", columnNames = "id"),
        })
public class UserAccount implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "id",
            nullable = false,
            updatable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name",
            nullable = false)
    private String name;

    @Column(name = "max_storage_bytes",
            nullable = false)
    private long maxStorageBytes;

    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getMaxStorageBytes() {
        return maxStorageBytes;
    }

    public void setMaxStorageBytes(long storageUsed) {
        this.maxStorageBytes = storageUsed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public UserAccountView toUserAccountView() {
        return UserAccountView.from(this);
    }
}