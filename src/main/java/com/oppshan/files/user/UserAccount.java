package com.oppshan.files.user;

import com.oppshan.files.common.AuditableEntity;
import com.oppshan.files.common.AuditableEntityEntityListener;
import com.oppshan.files.file.UserStorage;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.UuidGenerator.Style;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Entity
@EntityListeners({
        AuditableEntityEntityListener.class,
})
@Table(name = "user_account",
        indexes = {
                @Index(name = "idx_user_account_created_at", columnList = "created_at"),
                @Index(name = "idx_user_account_first_name", columnList = "first_name"),
                @Index(name = "idx_user_account_last_name", columnList = "last_name"),
        })
public class UserAccount
        implements AuditableEntity<UserAccount>, Comparable<UserAccount>, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "uuid",
            nullable = false,
            updatable = false)
    @UuidGenerator(style = Style.VERSION_7)
    @NotNull
    private UUID uuid;

    @Column(name = "first_name",
            nullable = false)
    @NotEmpty
    private String firstName;

    @Column(name = "last_name",
            nullable = false)
    @NotEmpty
    private String lastName;

    @OneToMany(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            mappedBy = "userAccount",
            fetch = FetchType.LAZY,
            targetEntity = IdpAccount.class
    )
    private Set<@NotNull IdpAccount> idpAccounts;

    @OneToOne(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            mappedBy = "userAccount",
            fetch = FetchType.EAGER,
            optional = false,
            targetEntity = UserStorage.class
    )
    @NotNull
    private UserStorage userStorage;

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
    public UserAccount setUuid(UUID uuid) {
        this.uuid = uuid;
        return this;
    }


    public String getFirstName() {
        return firstName;
    }

    public UserAccount setFirstName(String firstName) {
        this.firstName = firstName;
        return this;
    }

    public String getLastName() {
        return lastName;
    }

    public UserAccount setLastName(String lastName) {
        this.lastName = lastName;
        return this;
    }

    public Set<IdpAccount> getIdpAccounts() {
        idpAccounts = Objects.requireNonNullElseGet(idpAccounts, HashSet::new);
        return idpAccounts;
    }

    public UserStorage getUserStorage() {
        return userStorage;
    }

    public UserAccount setUserStorage(UserStorage userStorage) {
        this.userStorage = userStorage;
        return this;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public UserAccount setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    @Override
    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    @Override
    public UserAccount setLastModifiedAt(Instant lastModifiedAt) {
        this.lastModifiedAt = lastModifiedAt;
        return this;
    }

    @Override
    public int compareTo(UserAccount otherUserAccount) {
        return UserAccountComparator.FIRST_NAME.compare(this, otherUserAccount);
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }

        if (!(other instanceof final UserAccount that)) {
            return false;
        }

        return Objects.equals(uuid, that.uuid) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(lastModifiedAt, that.lastModifiedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                uuid,
                createdAt,
                lastModifiedAt
        );
    }

    public UserAccountView toUserAccountView(String email,
                                             String photoUrl,
                                             long usedStorageBytes) {
        return new UserAccountView(
                uuid,
                firstName,
                lastName,
                email,
                photoUrl,
                usedStorageBytes,
                userStorage.getMaxStorageBytes(),
                createdAt
        );
    }

    public enum UserAccountComparator implements Comparator<UserAccount> {
        FIRST_NAME(Comparator.comparing(UserAccount::getFirstName)
                .thenComparing(UserAccount::getLastName)
                .thenComparing(UserAccount::getCreatedAt)
                .thenComparing(UserAccount::getLastModifiedAt)),
        LAST_NAME(Comparator.comparing(UserAccount::getLastName)
                .thenComparing(UserAccount::getFirstName)
                .thenComparing(UserAccount::getCreatedAt)
                .thenComparing(UserAccount::getLastModifiedAt)),
        CREATED_AT(Comparator.comparing(UserAccount::getCreatedAt)
                .thenComparing(UserAccount::getFirstName)
                .thenComparing(UserAccount::getLastName)
                .thenComparing(UserAccount::getLastModifiedAt)),
        ;

        private final Comparator<UserAccount> comparator;

        UserAccountComparator(Comparator<UserAccount> comparator) {
            this.comparator = comparator;
        }

        @Override
        public int compare(UserAccount userAccount1, UserAccount userAccount2) {
            return comparator.compare(userAccount1, userAccount2);
        }
    }
}