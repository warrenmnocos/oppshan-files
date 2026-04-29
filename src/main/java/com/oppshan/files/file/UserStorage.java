package com.oppshan.files.file;

import com.oppshan.files.common.AuditableEntity;
import com.oppshan.files.common.AuditableEntityEntityListener;
import com.oppshan.files.user.UserAccount;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.UuidGenerator.Style;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@EntityListeners({
        AuditableEntityEntityListener.class
})
@Table(name = "user_storage")
public class UserStorage
        implements AuditableEntity<UserStorage>, Comparable<UserStorage>, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "uuid",
            nullable = false,
            updatable = false)
    @UuidGenerator(style = Style.VERSION_7)
    @NotNull
    private UUID uuid;

    @OneToOne(
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

    @Column(name = "max_storage_bytes",
            nullable = false)
    @PositiveOrZero
    private long maxStorageBytes;

    @Column(name = "max_file_upload_bytes",
            nullable = false)
    @PositiveOrZero
    private long maxFileUploadBytes;

    @OneToOne(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY,
            optional = false,
            targetEntity = FileNode.class
    )
    @JoinColumn(
            name = "root_file_node_uuid",
            nullable = false,
            updatable = false
    )
    @NotNull
    private FileNode rootFileNode;

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

    public long getMaxFileUploadBytes() {
        return maxFileUploadBytes;
    }

    public UserStorage setMaxFileUploadBytes(long maxFileUploadBytes) {
        this.maxFileUploadBytes = maxFileUploadBytes;
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
}
