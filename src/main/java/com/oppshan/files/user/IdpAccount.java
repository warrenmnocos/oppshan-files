package com.oppshan.files.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "idp_account",
        indexes = {
                @Index(name = "idx_idp_account_created_at", columnList = "created_at"),
                @Index(name = "uc_idp_account", columnList = "id, provider_id, provider_name"),
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uc_idp_account_id", columnNames = "id"),
                @UniqueConstraint(name = "uc_idp_account_provider", columnNames = "provider_id, provider_name, user_account_id"),
        })
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class IdpAccount implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "id",
            nullable = false,
            updatable = false)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "provider_id",
            nullable = false,
            updatable = false)
    private String providerId;

    @Column(name = "provider_name",
            nullable = false,
            updatable = false)
    private String providerName;

    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_account_id",
            nullable = false,
            updatable = false)
    private UserAccount userAccount;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getProviderName() {
        return providerName;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public UserAccount getUserAccount() {
        return userAccount;
    }

    public void setUserAccount(UserAccount user) {
        this.userAccount = user;
    }
}
