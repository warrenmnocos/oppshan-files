package com.oppshan.files.file;

import com.oppshan.files.user.IdpAccount;
import com.oppshan.files.user.UserAccount;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.io.Serial;
import java.io.Serializable;
import java.sql.Blob;
import java.time.Instant;
import java.util.Comparator;
import java.util.SortedSet;
import java.util.UUID;

@Entity
@Table(name = "file_node",
        indexes = {
                @Index(name = "idx_file_node_created_at", columnList = "user_account_id,created_at,name,mime_type,size_bytes"),
                @Index(name = "idx_file_node_last_modified_at", columnList = "user_account_id,last_modified_at,name,mime_type,size_bytes"),
                @Index(name = "idx_file_node_name", columnList = "user_account_id,parent_file_node_id,name,mime_type,last_modified_at"),
                @Index(name = "idx_file_node_size_bytes", columnList = "user_account_id,parent_file_node_id,size_bytes,name,mime_type"),
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uc_file_node_id", columnNames = "id"),
                @UniqueConstraint(name = "uc_file_node_name", columnNames = "parent_file_node_id,name,mime_type"),
        }
)
public class FileNode implements Comparable<FileNode>, Serializable {

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

    @Column(name = "mime_type",
            nullable = false,
            updatable = false)
    private String mimeType;

    @Column(name = "directory",
            nullable = false,
            updatable = false)
    private boolean directory;

    @Column(name = "size_bytes",
            nullable = false,
            updatable = false)
    private long sizeBytes;

    @Lob
    @Column(name = "content",
            nullable = false,
            updatable = false)
    private Blob content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "parent_file_node_id",
            updatable = false
    )
    private FileNode parentFileNode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "user_account_id",
            nullable = false,
            updatable = false
    )
    private UserAccount userAccount;

    @OneToMany(
            mappedBy = "parentFileNode",
            fetch = FetchType.LAZY,
            cascade = CascadeType.ALL,
            targetEntity = IdpAccount.class
    )
    private SortedSet<FileNode> fileNodes;

    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    private Instant createdAt;

    @Column(name = "last_modified_at",
            nullable = false)
    private Instant lastModifiedAt;

    public UUID getId() {
        return id;
    }

    public FileNode setId(UUID id) {
        this.id = id;
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

    public SortedSet<FileNode> getFileNodes() {
        return fileNodes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public FileNode setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    public Instant getLastModifiedAt() {
        return lastModifiedAt;
    }

    public FileNode setLastModifiedAt(Instant lastModifiedAt) {
        this.lastModifiedAt = lastModifiedAt;
        return this;
    }

    @Override
    public int compareTo(FileNode otherFileNode) {
        return FileNodeComparator.NAME.compare(this, otherFileNode);
    }

    public enum FileNodeComparator implements Comparator<FileNode> {
        NAME(Comparator.comparing(FileNode::getUserAccount)
                .thenComparing(FileNode::getParentFileNode, Comparator.comparing(FileNode::getId))
                .thenComparing(FileNode::getName)
                .thenComparing(FileNode::getMimeType)
                .thenComparing(FileNode::getLastModifiedAt)
        ),
        SIZE_BYTES(Comparator.comparing(FileNode::getUserAccount)
                .thenComparing(FileNode::getParentFileNode, Comparator.comparing(FileNode::getId))
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
