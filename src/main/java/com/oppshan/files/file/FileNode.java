package com.oppshan.files.file;

import com.oppshan.files.common.AuditableEntity;
import com.oppshan.files.common.AuditableEntityEntityListener;
import com.oppshan.files.user.UserAccount;
import jakarta.persistence.Basic;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.LazyGroup;
import org.hibernate.annotations.Type;

import java.io.Serial;
import java.io.Serializable;
import java.sql.Blob;
import java.time.Instant;
import java.util.Comparator;
import java.util.Objects;
import java.util.SortedSet;
import java.util.UUID;

@Entity
@EntityListeners({
        AuditableEntityEntityListener.class
})
@Table(name = "file_node",
        indexes = {
                @Index(name = "idx_file_node_created_at", columnList = "user_account_id,created_at,name,mime_type,size_bytes"),
                @Index(name = "idx_file_node_last_modified_at", columnList = "user_account_id,last_modified_at,name,mime_type,size_bytes"),
                @Index(name = "idx_file_node_name", columnList = "user_account_id,parent_file_node_id,name,mime_type,last_modified_at"),
                @Index(name = "idx_file_node_size_bytes", columnList = "user_account_id,parent_file_node_id,size_bytes,name,mime_type"),
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uc_file_node_id", columnNames = "id"),
                @UniqueConstraint(name = "uc_file_node_uuid", columnNames = "uuid"),
                @UniqueConstraint(
                        name = "uc_file_node_name",
                        columnNames = {
                                "parent_file_node_id",
                                "name",
                                "mime_type"
                        }
                ),
        }
)
public class FileNode
        implements AuditableEntity<FileNode>, Comparable<FileNode>, Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "id",
            nullable = false,
            updatable = false)
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "file_node_sequence_generator")
    @SequenceGenerator(
            name = "file_node_sequence_generator",
            sequenceName = "file_node_sequence",
            allocationSize = 100)
    @NotNull
    private Long id;

    @Column(name = "uuid",
            nullable = false,
            updatable = false)
    @NotNull
    private UUID uuid;

    @Column(name = "name",
            nullable = false)
    @NotEmpty
    private String name;

    @Column(name = "mime_type",
            nullable = false)
    @NotEmpty
    private String mimeType;

    @Column(name = "directory",
            nullable = false,
            updatable = false)
    private boolean directory;

    @Column(name = "size_bytes",
            nullable = false,
            updatable = false)
    private long sizeBytes;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "content",
            updatable = false)
    @Type(EncryptedBlobUserType.class)
    @LazyGroup("fileNodeContent")
    private Blob content;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false,
            targetEntity = FileNode.class
    )
    @JoinColumn(
            name = "parent_file_node_id",
            updatable = false
    )
    private FileNode parentFileNode;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false,
            targetEntity = UserAccount.class
    )
    @JoinColumn(
            name = "user_account_id",
            nullable = false,
            updatable = false
    )
    @NotNull
    private UserAccount userAccount;

    @OneToMany(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            mappedBy = "parentFileNode",
            fetch = FetchType.LAZY,
            targetEntity = FileNode.class
    )
    private SortedSet<@NotNull FileNode> childFileNodes;

    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    @NotNull
    private Instant createdAt;

    @Column(name = "last_modified_at",
            nullable = false)
    @NotNull
    private Instant lastModifiedAt;

    public static FileNode createRoot(UserAccount userAccount) {
        return new FileNode()
                .setName("root")
                .setMimeType("application/vnd.oppshan-files.folder")
                .setDirectory(true)
                .setUserAccount(userAccount);
    }

    public Long getId() {
        return id;
    }

    public FileNode setId(Long id) {
        this.id = id;
        return this;
    }

    @Override
    public UUID getUuid() {
        return uuid;
    }

    @Override
    public FileNode setUuid(UUID uuid) {
        this.uuid = uuid;
        return this;
    }

    public String getName() {
        return name;
    }

    public FileNode setName(String name) {
        this.name = name;
        return this;
    }

    public String getMimeType() {
        return mimeType;
    }

    public FileNode setMimeType(String mimeType) {
        this.mimeType = mimeType;
        return this;
    }

    public boolean isDirectory() {
        return directory;
    }

    public FileNode setDirectory(boolean directory) {
        this.directory = directory;
        return this;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public FileNode setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
        return this;
    }

    public Blob getContent() {
        return content;
    }

    public FileNode setContent(Blob content) {
        this.content = content;
        return this;
    }

    public FileNode getParentFileNode() {
        return parentFileNode;
    }

    public FileNode setParentFileNode(FileNode parentFileNode) {
        this.parentFileNode = parentFileNode;
        return this;
    }

    public UserAccount getUserAccount() {
        return userAccount;
    }

    public FileNode setUserAccount(UserAccount userAccount) {
        this.userAccount = userAccount;
        return this;
    }

    public SortedSet<FileNode> getChildFileNodes() {
        return childFileNodes;
    }

    public FileNode setChildFileNodes(SortedSet<FileNode> childFileNodes) {
        this.childFileNodes = childFileNodes;
        return this;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public FileNode setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    @Override
    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    @Override
    public FileNode setLastModifiedAt(Instant lastModifiedAt) {
        this.lastModifiedAt = lastModifiedAt;
        return this;
    }

    @Override
    public int compareTo(FileNode otherFileNode) {
        return FileNodeComparator.NAME.compare(this, otherFileNode);
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }

        if (!(other instanceof final FileNode fileNode)) {
            return false;
        }

        return Objects.equals(id, fileNode.id) &&
                Objects.equals(uuid, fileNode.uuid) &&
                Objects.equals(createdAt, fileNode.createdAt) &&
                Objects.equals(lastModifiedAt, fileNode.lastModifiedAt);
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

    public enum FileNodeComparator implements Comparator<FileNode> {
        NAME(Comparator.comparing(FileNode::getUserAccount)
                .thenComparing(FileNode::getParentFileNode, Comparator.nullsLast(Comparator.comparing(FileNode::getId)))
                .thenComparing(FileNode::getName)
                .thenComparing(FileNode::getMimeType)
                .thenComparing(FileNode::getLastModifiedAt)
        ),
        SIZE_BYTES(Comparator.comparing(FileNode::getUserAccount)
                .thenComparing(FileNode::getParentFileNode, Comparator.nullsLast(Comparator.comparing(FileNode::getId)))
                .thenComparingLong(FileNode::getSizeBytes)
                .thenComparing(FileNode::getName)
                .thenComparing(FileNode::getMimeType)
        ),
        ;

        private final Comparator<FileNode> comparator;

        FileNodeComparator(Comparator<FileNode> comparator) {
            this.comparator = comparator;
        }

        @Override
        public int compare(FileNode fileNode1, FileNode fileNode2) {
            return comparator.compare(fileNode1, fileNode2);
        }
    }
}
