package com.oppshan.files.file;

import com.google.common.base.MoreObjects;
import com.oppshan.files.common.AuditableEntity;
import com.oppshan.files.common.AuditableEntityEntityListener;
import com.oppshan.files.user.UserAccount;
import jakarta.persistence.Basic;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.ColumnResult;
import jakarta.persistence.ConstructorResult;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.NamedNativeQueries;
import jakarta.persistence.NamedNativeQuery;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.SqlResultSetMapping;
import jakarta.persistence.SqlResultSetMappings;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.hibernate.annotations.LazyGroup;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.annotations.UuidGenerator.Style;

import java.io.Serial;
import java.io.Serializable;
import java.sql.Blob;
import java.time.Instant;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Entity
@EntityListeners({
        AuditableEntityEntityListener.class
})
@Table(name = "file_node",
        indexes = {
                @Index(name = "idx_file_node_created_at", columnList = "user_account_uuid,created_at,name,mime_type,size_bytes"),
                @Index(name = "idx_file_node_last_modified_at", columnList = "user_account_uuid,last_modified_at,name,mime_type,size_bytes"),
                @Index(name = "idx_file_node_name", columnList = "user_account_uuid,parent_file_node_uuid,name,mime_type,last_modified_at"),
                @Index(name = "idx_file_node_size_bytes", columnList = "user_account_uuid,parent_file_node_uuid,size_bytes,name,mime_type"),
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uc_file_node_name",
                        columnNames = {
                                "user_account_uuid",
                                "parent_file_node_uuid",
                                "name",
                                "mime_type"
                        }
                ),
        }
)
@NamedNativeQueries({
        @NamedNativeQuery(
                name = FileNode.GET_DIRECTORY_STATISTICS,
                query = """
                        WITH RECURSIVE descendants AS (
                            SELECT uuid, directory, size_bytes
                            FROM file_node
                            WHERE user_account_uuid = :userAccountUuid
                                AND parent_file_node_uuid = :fileNodeDirectoryUuid
                            UNION ALL
                            SELECT fn.uuid, fn.directory, fn.size_bytes
                            FROM file_node fn
                            INNER JOIN descendants d ON fn.parent_file_node_uuid = d.uuid
                        )
                        SELECT
                            COUNT(*) FILTER (WHERE directory = true) AS folder_count,
                            COUNT(*) FILTER (WHERE directory = false) AS file_count,
                            COALESCE(SUM(size_bytes) FILTER (WHERE directory = false), 0) AS total_size_bytes
                        FROM descendants
                        """,
                resultSetMapping = FileNode.DIRECTORY_STATISTICS_MAPPING,
                resultClass = DirectoryStatistics.class
        ),
        @NamedNativeQuery(
                name = FileNode.GET_ANCESTORS,
                query = """
                        WITH RECURSIVE ancestors AS (
                            SELECT uuid, name, parent_file_node_uuid, 0 AS depth
                            FROM file_node
                            WHERE user_account_uuid = :userAccountUuid
                                AND uuid = :fileNodeUuid
                                AND directory = true
                            UNION ALL
                            SELECT parent.uuid, parent.name, parent.parent_file_node_uuid, a.depth + 1
                            FROM file_node parent
                            INNER JOIN ancestors a ON parent.uuid = a.parent_file_node_uuid
                            WHERE parent.user_account_uuid = :userAccountUuid
                        )
                        SELECT uuid, name
                        FROM ancestors
                        ORDER BY depth DESC
                        """,
                resultSetMapping = FileNode.BREADCRUMB_VIEW_MAPPING,
                resultClass = BreadcrumbView.class
        ),
        @NamedNativeQuery(
                name = FileNode.RESOLVE_DIRECTORY_PATH,
                query = """
                        WITH RECURSIVE segments(idx, segment) AS (
                            SELECT ordinality, segment
                            FROM unnest(string_to_array(:path, '/'))
                                WITH ORDINALITY AS t(segment, ordinality)
                            WHERE segment <> ''
                        ),
                        walk AS (
                            SELECT fn.uuid, 0 AS depth
                            FROM file_node fn
                            INNER JOIN user_storage us
                                ON us.root_file_node_uuid = fn.uuid
                            WHERE us.user_account_uuid = :userAccountUuid
                            UNION ALL
                            SELECT child.uuid, w.depth + 1
                            FROM file_node child
                            INNER JOIN walk w
                                ON child.parent_file_node_uuid = w.uuid
                            INNER JOIN segments s
                                ON s.idx = w.depth + 1
                            WHERE child.user_account_uuid = :userAccountUuid
                                AND child.directory = true
                                AND child.name = s.segment
                        )
                        SELECT uuid
                        FROM walk
                        WHERE depth = (SELECT COUNT(*) FROM segments)
                        LIMIT 1
                        """,
                resultClass = UUID.class
        ),
})
@SqlResultSetMappings({
        @SqlResultSetMapping(
                name = FileNode.DIRECTORY_STATISTICS_MAPPING,
                classes = @ConstructorResult(
                        targetClass = DirectoryStatistics.class,
                        columns = {
                                @ColumnResult(name = "folder_count", type = Long.class),
                                @ColumnResult(name = "file_count", type = Long.class),
                                @ColumnResult(name = "total_size_bytes", type = Long.class),
                        }
                )
        ),
        @SqlResultSetMapping(
                name = FileNode.BREADCRUMB_VIEW_MAPPING,
                classes = @ConstructorResult(
                        targetClass = BreadcrumbView.class,
                        columns = {
                                @ColumnResult(name = "uuid", type = UUID.class),
                                @ColumnResult(name = "name", type = String.class),
                        }
                )
        ),
})
public class FileNode
        implements AuditableEntity<FileNode>, Comparable<FileNode>, Serializable {

    static final String GET_DIRECTORY_STATISTICS = "FileNode.getDirectoryStatistics";

    static final String DIRECTORY_STATISTICS_MAPPING = "DirectoryStatisticsMapping";

    static final String GET_ANCESTORS = "FileNode.getAncestors";

    static final String BREADCRUMB_VIEW_MAPPING = "BreadcrumbViewMapping";

    static final String RESOLVE_DIRECTORY_PATH = "FileNode.resolveDirectoryPath";

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "uuid",
            nullable = false,
            updatable = false)
    @UuidGenerator(style = Style.VERSION_7)
    @NotNull
    private UUID uuid;

    @Basic(optional = false)
    @Column(name = "name",
            nullable = false)
    @NotEmpty
    private String name;

    @Basic(optional = false)
    @Column(name = "mime_type",
            nullable = false)
    @NotEmpty
    private String mimeType;

    @Basic(optional = false)
    @Column(name = "directory",
            nullable = false,
            updatable = false)
    private boolean directory;

    @Basic(optional = false)
    @Column(name = "size_bytes",
            nullable = false,
            updatable = false)
    @PositiveOrZero
    private long sizeBytes;

    @Basic(fetch = FetchType.LAZY)
    @Column(name = "content",
            updatable = false)
    @Type(EncryptedBlobUserType.class)
    @LazyGroup("fileNodeContent")
    private Blob content;

    @ManyToOne(
            fetch = FetchType.LAZY,
            targetEntity = FileNode.class
    )
    @JoinColumn(
            name = "parent_file_node_uuid",
            updatable = false
    )
    private FileNode parentFileNode;

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

    @OneToMany(
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            mappedBy = "parentFileNode",
            fetch = FetchType.LAZY,
            targetEntity = FileNode.class
    )
    @LazyGroup("fileNodeChildFileNodes")
    @NotNull
    private SortedSet<@NotNull FileNode> childFileNodes;

    @Basic(optional = false)
    @Column(name = "created_at",
            nullable = false,
            updatable = false)
    @NotNull
    private Instant createdAt;

    @Basic(optional = false)
    @Column(name = "last_modified_at",
            nullable = false)
    @NotNull
    private Instant lastModifiedAt;

    public static FileNode createRoot(UserAccount userAccount) {
        return new FileNode()
                .setName("root")
                .setMimeType("application/vnd.oppshan-files.folder")
                .setDirectory(true)
                .setUserAccount(userAccount)
                .addDirectoryChildFileNode("Audio")
                .addDirectoryChildFileNode("Documents")
                .addDirectoryChildFileNode("Photos")
                .addDirectoryChildFileNode("Videos");
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

    public Optional<Blob> getContent() {
        return Optional.ofNullable(content);
    }

    public FileNode setContent(Blob content) {
        this.content = content;
        return this;
    }

    public Optional<FileNode> getParentFileNode() {
        return Optional.ofNullable(parentFileNode);
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
        childFileNodes = Objects.requireNonNullElseGet(childFileNodes, TreeSet::new);
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

    public FileNode addDirectoryChildFileNode(String name) {
        if (directory) {
            getChildFileNodes().add(
                    new FileNode()
                            .setName(name)
                            .setMimeType(mimeType)
                            .setParentFileNode(this)
                            .setDirectory(true)
                            .setUserAccount(userAccount)
            );
        }

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

        return Objects.equals(uuid, fileNode.uuid) &&
               Objects.equals(createdAt, fileNode.createdAt) &&
               Objects.equals(lastModifiedAt, fileNode.lastModifiedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                uuid,
                createdAt,
                lastModifiedAt
        );
    }

    public BreadcrumbView toBreadcrumbView() {
        return new BreadcrumbView(
                uuid,
                name
        );
    }

    public List<BreadcrumbView> toBreadcrumbViews() {
        return Stream.iterate(this, Objects::nonNull, parentFileNode -> parentFileNode.parentFileNode)
                .map(FileNode::toBreadcrumbView)
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedList::new),
                        breadcrumbs -> {
                            Collections.reverse(breadcrumbs);
                            return breadcrumbs;
                        }
                ));
    }

    public FileNodeView toFileNodeView() {
        return new FileNodeView(
                uuid,
                name,
                mimeType,
                directory,
                sizeBytes,
                parentFileNode != null ? parentFileNode.uuid : null,
                createdAt,
                lastModifiedAt
        );
    }

    public List<FileNodeView> toChildFileNodeViews() {
        return childFileNodes.stream()
                .map(FileNode::toFileNodeView)
                .collect(Collectors.toList());
    }

    public DirectoryContentsView toDirectoryContentsView() {
        return new DirectoryContentsView(
                uuid,
                name,
                parentFileNode != null ? parentFileNode.uuid : null,
                toBreadcrumbViews(),
                toChildFileNodeViews()
        );
    }

    public DirectoryContentsView toDirectoryContentsView(List<BreadcrumbView> breadcrumbs) {
        final var parentUuid = breadcrumbs.size() >= 2
                ? breadcrumbs.get(breadcrumbs.size() - 2).uuid()
                : null;
        return new DirectoryContentsView(
                uuid,
                name,
                parentUuid,
                breadcrumbs,
                toChildFileNodeViews()
        );
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("uuid", uuid)
                .add("name", name)
                .add("mimeType", mimeType)
                .add("directory", directory)
                .add("parentFileNode", parentFileNode)
                .add("userAccount", userAccount)
                .add("childFileNodes", childFileNodes)
                .add("createdAt", createdAt)
                .add("lastModifiedAt", lastModifiedAt)
                .add("sizeBytes", sizeBytes)
                .toString();
    }

    @PrePersist
    private void onPrePersist() {
        initialize();
    }

    @PostLoad
    private void onPostLoad() {
        initialize();
    }

    private void initialize() {
        childFileNodes = Objects.requireNonNullElseGet(childFileNodes, TreeSet::new);
    }

    public enum FileNodeComparator implements Comparator<FileNode> {
        NAME(Comparator.comparing(FileNode::getUserAccount)
                .thenComparing(fileNode -> fileNode.parentFileNode, Comparator.nullsLast(Comparator.comparing(FileNode::getUuid)))
                .thenComparing(FileNode::getName)
                .thenComparing(FileNode::getMimeType)
                .thenComparing(FileNode::getLastModifiedAt)
        ),
        SIZE_BYTES(Comparator.comparing(FileNode::getUserAccount)
                .thenComparing(fileNode -> fileNode.parentFileNode, Comparator.nullsLast(Comparator.comparing(FileNode::getUuid)))
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
