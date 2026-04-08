package com.oppshan.files.file;

import com.oppshan.files.common.AuditableEntity;
import com.oppshan.files.common.AuditableEntityEntityListener;
import com.oppshan.files.user.UserAccount;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@EntityListeners({
        AuditableEntityEntityListener.class
})
@Table(name = "user_storage",
        uniqueConstraints = {
                @UniqueConstraint(name = "uc_user_storage_id", columnNames = "id"),
                @UniqueConstraint(name = "uc_user_storage_uuid", columnNames = "uuid"),
        }
)
public class UserStorage
        implements AuditableEntity<UserStorage>, Comparable<UserStorage>, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "id",
            nullable = false,
            updatable = false)
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "user_storage_sequence_generator")
    @SequenceGenerator(
            name = "user_storage_sequence_generator",
            sequenceName = "user_storage_sequence",
            allocationSize = 100)
    private Long id;

    @Column(name = "uuid",
            nullable = false,
            updatable = false)
    @NotNull
    private UUID uuid;

    @OneToOne(
            fetch = FetchType.LAZY,
            optional = false,
            targetEntity = UserAccount.class
    )
    @JoinColumn(
            name = "user_account_id",
            nullable = false,
            updatable = false
    )
    private UserAccount userAccount;

    @Column(name = "max_storage_bytes",
            nullable = false)
    private long maxStorageBytes;

    @OneToOne(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY,
            optional = false,
            targetEntity = FileNode.class
    )
    @JoinColumn(
            name = "root_file_node_id",
            nullable = false,
            updatable = false
    )
    private FileNode rootFileNode;

    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    private Instant createdAt;

    @Column(name = "last_modified_at",
            nullable = false)
    private Instant lastModifiedAt;

    public Long getId() {
        return id;
    }

    public UserStorage setId(Long id) {
        this.id = id;
        return this;
    }

    @Override
    public UUID getUuid() {
        return uuid;
    }

    @Override
    public UserStorage setUuid(UUID uuid) {
        this.uuid = uuid;
        return this;
    }

    public UserAccount getUserAccount() {
        return userAccount;
    }

    public UserStorage setUserAccount(UserAccount userAccount) {
        this.userAccount = userAccount;
        return this;
    }

    public long getMaxStorageBytes() {
        return maxStorageBytes;
    }

    public UserStorage setMaxStorageBytes(long maxStorageBytes) {
        this.maxStorageBytes = maxStorageBytes;
        return this;
    }

    public FileNode getRootFileNode() {
        return rootFileNode;
    }

    public UserStorage setRootFileNode(FileNode rootFileNode) {
        this.rootFileNode = rootFileNode;
        return this;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public UserStorage setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    @Override
    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    @Override
    public UserStorage setLastModifiedAt(Instant lastModifiedAt) {
        this.lastModifiedAt = lastModifiedAt;
        return this;
    }

    @Override
    public int compareTo(UserStorage otherUserStorage) {
        return userAccount.compareTo(otherUserStorage.getUserAccount());
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }

        if (!(other instanceof final UserStorage that)) {
            return false;
        }

        return Objects.equals(id, that.id) &&
                Objects.equals(uuid, that.uuid) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(lastModifiedAt, that.lastModifiedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                id,
                uuid,
                createdAt,
                lastModifiedAt
        );
    }
}
