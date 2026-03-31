package com.oppshan.files.user;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Collections;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "user_account",
        indexes = {
                @Index(name = "idx_user_account_created_at", columnList = "created_at"),
                @Index(name = "idx_user_account_name", columnList = "name"),
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

    @OneToMany(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            mappedBy = "userAccount",
            fetch = FetchType.LAZY,
            targetEntity = IdpAccount.class
    )
    private Set<IdpAccount> idpAccounts;

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

    public Set<IdpAccount> getIdpAccounts() {
        return Objects.requireNonNullElse(idpAccounts, Collections.emptySet());
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public UserAccountView toUserAccountView() {
        return new UserAccountView(
                id,
                name,
                maxStorageBytes,
                createdAt
        );
    }
}