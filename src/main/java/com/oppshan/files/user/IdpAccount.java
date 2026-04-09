package com.oppshan.files.user;

import com.oppshan.files.common.AuditableEntity;
import com.oppshan.files.common.AuditableEntityEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.UuidGenerator.Style;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Entity
@EntityListeners({
        AuditableEntityEntityListener.class
})
@Table(name = "idp_account",
        indexes = {
                @Index(name = "idx_idp_account_created_at", columnList = "created_at"),
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uc_idp_account_provider",
                        columnNames = {
                                "provider_id",
                                "provider_name",
                                "user_account_uuid"
                        }
                ),
        })
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class IdpAccount
        implements AuditableEntity<IdpAccount>, Comparable<IdpAccount>, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "uuid",
            nullable = false,
            updatable = false)
    @UuidGenerator(style = Style.VERSION_7)
    @NotNull
    private UUID uuid;

    @Column(name = "provider_id",
            nullable = false,
            updatable = false)
    @NotEmpty
    private String providerId;

    @Column(name = "provider_name",
            nullable = false,
            updatable = false)
    @NotEmpty
    private String providerName;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false,
            targetEntity = UserAccount.class
    )
    @JoinColumn(
            name = "user_account_uuid",
            nullable = false,
            updatable = false
    )
    @NotNull
    private UserAccount userAccount;

    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    @NotNull
    private Instant createdAt;

    @Column(name = "last_modified_at",
            nullable = false)
    @NotNull
    private Instant lastModifiedAt;

    @Override
    public UUID getUuid() {
        return uuid;
    }

    @Override
    public IdpAccount setUuid(UUID uuid) {
        this.uuid = uuid;
        return this;
    }

    public String getProviderId() {
        return providerId;
    }

    public IdpAccount setProviderId(String providerId) {
        this.providerId = providerId;
        return this;
    }

    public String getProviderName() {
        return providerName;
    }

    public IdpAccount setProviderName(String providerName) {
        this.providerName = providerName;
        return this;
    }

    public UserAccount getUserAccount() {
        return userAccount;
    }

    public IdpAccount setUserAccount(UserAccount userAccount) {
        this.userAccount = userAccount;
        return this;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public IdpAccount setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    @Override
    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    @Override
    public IdpAccount setLastModifiedAt(Instant lastModifiedAt) {
        this.lastModifiedAt = lastModifiedAt;
        return this;
    }

    @Override
    public int compareTo(IdpAccount otherIdpAccount) {
        return uuid.compareTo(otherIdpAccount.getUuid());
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }

        if (!(other instanceof final IdpAccount that)) {
            return false;
        }

        return Objects.equals(providerId, that.providerId) &&
                Objects.equals(providerName, that.providerName) &&
                Objects.equals(userAccount, that.userAccount);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                providerId,
                providerName,
                userAccount
        );
    }

    public Optional<GoogleAccount> asGoogleAccount() {
        return Optional.of(this)
                .filter(GoogleAccount.class::isInstance)
                .map(GoogleAccount.class::cast);
    }
}
