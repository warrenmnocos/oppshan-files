package com.oppshan.files.file;

import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.exception.MessageCode;
import com.oppshan.files.user.UserAccount;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
class FileNodeServiceTest {

    private static final long DEFAULT_MAX_STORAGE_BYTES = 10_000_000L;

    private static final long DEFAULT_MAX_FILE_UPLOAD_BYTES = 1_000_000L;

    private static final String TEXT_MIME_TYPE = "text/plain";

    @Inject
    FileNodeService fileNodeService;

    @Inject
    EntityManager entityManager;

    private UUID userAccountUuid;

    private UUID rootDirectoryUuid;

    @Test
    void shouldReturnRootWithFourDefaultSubdirectoriesWhenGettingRootContents() {
        seedUser();

        final var view = fileNodeService.getRootDirectoryContents(userAccountUuid);

        assertThat(view.uuid(), is(rootDirectoryUuid));
        assertThat(view.parentUuid(), is(nullValue()));
        assertThat(view.childrenFileNodeViews(), hasSize(4));
        assertThat(
                view.childrenFileNodeViews().stream().map(FileNodeView::name).toList(),
                containsInAnyOrder("Audio", "Documents", "Photos", "Videos")
        );
    }

    @Test
    void shouldReturnDirectoryWhenGettingContentsByUuid() {
        seedUser();

        final var view = fileNodeService.getDirectoryContents(userAccountUuid, rootDirectoryUuid);

        assertThat(view.uuid(), is(rootDirectoryUuid));
        assertThat(view.breadcrumbViews(), hasSize(1));
        assertThat(view.breadcrumbViews().get(0).name(), is("Root"));
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenGettingContentsByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.getDirectoryContents(userAccountUuid, UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldReturnRootWhenGettingContentsByEmptyPath() {
        seedUser();

        final var view = fileNodeService.getDirectoryContents(userAccountUuid, "");

        assertThat(view.uuid(), is(rootDirectoryUuid));
    }

    @Test
    void shouldResolveNestedSegmentsWhenGettingContentsByPath() {
        seedUser();
        createDirectory(rootDirectoryUuid, "Projects");

        final var view = fileNodeService.getDirectoryContents(userAccountUuid, "Projects");

        assertThat(view.name(), is("Projects"));
        assertThat(view.parentUuid(), is(rootDirectoryUuid));
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenGettingContentsByUnknownPath() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.getDirectoryContents(userAccountUuid, "Nope/Nada")
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldAggregateNestedFolderAndFileCountsWhenGettingDirectoryProperties() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");
        createDirectory(workspaceUuid, "Subfolder");
        uploadFile(workspaceUuid, "notes.txt", TEXT_MIME_TYPE, "hello world".getBytes(StandardCharsets.UTF_8));

        final var properties = fileNodeService.getDirectoryProperties(userAccountUuid, workspaceUuid);

        assertThat(properties.uuid(), is(workspaceUuid));
        assertThat(properties.name(), is("Workspace"));
        assertThat(properties.directoryCount(), is(1L));
        assertThat(properties.fileCount(), is(1L));
        assertThat(properties.totalSizeBytes(), is((long) "hello world".getBytes(StandardCharsets.UTF_8).length));
    }

    @Test
    void shouldThrowWhenGettingDirectoryPropertiesByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.getDirectoryProperties(userAccountUuid, UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldAddChildToParentWhenCreatingDirectory() {
        seedUser();

        final var view = fileNodeService.createDirectory(
                userAccountUuid,
                new CreateDirectoryRequest("Reports", rootDirectoryUuid)
        );

        assertThat(view.uuid(), is(rootDirectoryUuid));
        assertThat(
                view.childrenFileNodeViews().stream().map(FileNodeView::name).toList(),
                containsInAnyOrder("Audio", "Documents", "Photos", "Videos", "Reports")
        );
    }

    @Test
    void shouldTrimLeadingAndTrailingWhitespaceWhenCreatingDirectory() {
        seedUser();

        final var view = fileNodeService.createDirectory(
                userAccountUuid,
                new CreateDirectoryRequest("  Reports  ", rootDirectoryUuid)
        );

        assertThat(
                view.childrenFileNodeViews().stream().anyMatch(child -> child.name().equals("Reports")),
                is(true)
        );
    }

    @Test
    void shouldThrowFolderNameRequiredWhenCreatingDirectoryWithBlankName() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.createDirectory(
                        userAccountUuid,
                        new CreateDirectoryRequest("    ", rootDirectoryUuid)
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FOLDER_NAME_REQUIRED));
    }

    @Test
    void shouldThrowFolderNameNotUniqueWhenCreatingDirectoryWithDuplicateName() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.createDirectory(
                        userAccountUuid,
                        new CreateDirectoryRequest("Documents", rootDirectoryUuid)
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FOLDER_NAME_NOT_UNIQUE));
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenCreatingDirectoryUnderUnknownParent() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.createDirectory(
                        userAccountUuid,
                        new CreateDirectoryRequest("Orphan", UUID.randomUUID())
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldUpdateNameAndKeepParentWhenRenamingDirectory() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var view = fileNodeService.renameDirectory(
                userAccountUuid,
                workspaceUuid,
                new RenameFileNodeRequest("Workspace2")
        );

        assertThat(view.uuid(), is(rootDirectoryUuid));
        assertThat(
                view.childrenFileNodeViews().stream().anyMatch(child -> child.name().equals("Workspace2")),
                is(true)
        );
        assertThat(
                view.childrenFileNodeViews().stream().noneMatch(child -> child.name().equals("Workspace")),
                is(true)
        );
    }

    @Test
    void shouldThrowRootFolderDeletionNotAllowedWhenRenamingRoot() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameDirectory(
                        userAccountUuid,
                        rootDirectoryUuid,
                        new RenameFileNodeRequest("Renamed")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.ROOT_FOLDER_DELETION_NOT_ALLOWED));
    }

    @Test
    void shouldThrowFolderNameRequiredWhenRenamingDirectoryWithBlankName() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameDirectory(
                        userAccountUuid,
                        workspaceUuid,
                        new RenameFileNodeRequest("   ")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FOLDER_NAME_REQUIRED));
    }

    @Test
    void shouldThrowFolderNameNotUniqueWhenRenamingDirectoryCollidesWithSibling() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameDirectory(
                        userAccountUuid,
                        workspaceUuid,
                        new RenameFileNodeRequest("Documents")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FOLDER_NAME_NOT_UNIQUE));
    }

    @Test
    void shouldRemoveEmptyChildFolderWhenDeletingDirectory() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var view = fileNodeService.deleteDirectory(userAccountUuid, workspaceUuid);

        assertThat(view.uuid(), is(rootDirectoryUuid));
        assertThat(
                view.childrenFileNodeViews().stream().noneMatch(child -> child.name().equals("Workspace")),
                is(true)
        );
    }

    @Test
    void shouldRemoveNestedChildFolderHierarchyWhenDeletingDirectory() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");
        final var subfolderUuid = createDirectory(workspaceUuid, "Subfolder");
        createDirectory(subfolderUuid, "DeepSubfolder");
        uploadFile(workspaceUuid, "notes.txt", TEXT_MIME_TYPE, "abc".getBytes(StandardCharsets.UTF_8));

        final var view = fileNodeService.deleteDirectory(userAccountUuid, workspaceUuid);

        assertThat(
                view.childrenFileNodeViews().stream().noneMatch(child -> child.name().equals("Workspace")),
                is(true)
        );
        // Re-fetching the deleted directory should now fail
        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.getDirectoryContents(userAccountUuid, workspaceUuid)
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldThrowRootFolderDeletionNotAllowedWhenDeletingRoot() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.deleteDirectory(userAccountUuid, rootDirectoryUuid)
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.ROOT_FOLDER_DELETION_NOT_ALLOWED));
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenDeletingDirectoryByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.deleteDirectory(userAccountUuid, UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldPersistFileWithCorrectMetadataWhenUploading() {
        seedUser();
        final var content = "the quick brown fox".getBytes(StandardCharsets.UTF_8);

        final var view = fileNodeService.uploadFile(
                userAccountUuid,
                rootDirectoryUuid,
                "fox.txt",
                TEXT_MIME_TYPE,
                new ByteArrayInputStream(content)
        );

        final var uploadedFile = view.childrenFileNodeViews().stream()
                .filter(child -> child.name().equals("fox.txt"))
                .findFirst()
                .orElseThrow();
        assertThat(uploadedFile.directory(), is(false));
        assertThat(uploadedFile.mimeType(), is(TEXT_MIME_TYPE));
        assertThat(uploadedFile.sizeBytes(), is((long) content.length));
        assertThat(uploadedFile.parentUuid(), is(rootDirectoryUuid));
    }

    @Test
    void shouldThrowFileNameRequiredWhenUploadingWithBlankName() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.uploadFile(
                        userAccountUuid,
                        rootDirectoryUuid,
                        "   ",
                        TEXT_MIME_TYPE,
                        new ByteArrayInputStream(new byte[] {1, 2, 3})
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NAME_REQUIRED));
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenUploadingUnderUnknownParent() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.uploadFile(
                        userAccountUuid,
                        UUID.randomUUID(),
                        "fox.txt",
                        TEXT_MIME_TYPE,
                        new ByteArrayInputStream(new byte[] {1, 2, 3})
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldThrowFileNameNotUniqueWhenUploadingDuplicateName() {
        seedUser();
        final var content = "first".getBytes(StandardCharsets.UTF_8);
        uploadFile(rootDirectoryUuid, "report.txt", TEXT_MIME_TYPE, content);

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.uploadFile(
                        userAccountUuid,
                        rootDirectoryUuid,
                        "report.txt",
                        TEXT_MIME_TYPE,
                        new ByteArrayInputStream(content)
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NAME_NOT_UNIQUE));
    }

    @Test
    void shouldThrowFileSizeExceededWhenStreamBytesPastLimit() {
        seedUser(DEFAULT_MAX_STORAGE_BYTES, 32L);

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.uploadFile(
                        userAccountUuid,
                        rootDirectoryUuid,
                        "huge.txt",
                        TEXT_MIME_TYPE,
                        new ByteArrayInputStream(new byte[64])
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_SIZE_EXCEEDED));
    }

    @Test
    void shouldThrowFileQuotaExceededWhenTotalSizePastLimit() {
        seedUser(80L, 80L);
        final var fortyBytes = new byte[40];
        uploadFile(rootDirectoryUuid, "first.txt", TEXT_MIME_TYPE, fortyBytes);

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.uploadFile(
                        userAccountUuid,
                        rootDirectoryUuid,
                        "second.txt",
                        TEXT_MIME_TYPE,
                        new ByteArrayInputStream(new byte[60])
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_QUOTA_EXCEEDED));
    }

    @Test
    void shouldIncludeSiblingCommittedDuringUploadInDirectoryView() throws Exception {
        seedUser();

        final var slowDelayMillis = 1200L;
        final var fastContent = "fast".getBytes(StandardCharsets.UTF_8);
        final var slowContent = "slow".getBytes(StandardCharsets.UTF_8);
        final var executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            // The slow upload pauses on the first read of its body stream, stalling its
            // transaction inside flushWithSession (mid-INSERT) AFTER it has loaded the parent
            // directory but BEFORE it has committed.
            final var slowFuture = CompletableFuture.supplyAsync(
                    () -> fileNodeService.uploadFile(
                            userAccountUuid,
                            rootDirectoryUuid,
                            "slow.txt",
                            TEXT_MIME_TYPE,
                            new InitialDelayInputStream(new ByteArrayInputStream(slowContent), slowDelayMillis)
                    ),
                    executor
            );

            // Give the slow upload time to begin its transaction and load the parent (sees only
            // the 4 default folders) before the fast upload starts on the main thread.
            Thread.sleep(250);

            final var fastView = fileNodeService.uploadFile(
                    userAccountUuid,
                    rootDirectoryUuid,
                    "fast.txt",
                    TEXT_MIME_TYPE,
                    new ByteArrayInputStream(fastContent)
            );

            final var slowView = slowFuture.get(5, TimeUnit.SECONDS);

            // Slow's response includes fast.txt only because refreshWithSession re-reads the
            // children collection from a post-fast-commit READ COMMITTED snapshot. Without the
            // refresh, slowView would carry only the 4 defaults + slow.txt.
            assertThat(
                    slowView.childrenFileNodeViews().stream().map(FileNodeView::name).toList(),
                    containsInAnyOrder("Audio", "Documents", "Photos", "Videos", "slow.txt", "fast.txt")
            );
            // Fast's response was built while slow tx was still in-flight, so it correctly
            // omits slow.txt — confirming slow had not yet committed when fast ran.
            assertThat(
                    fastView.childrenFileNodeViews().stream().map(FileNodeView::name).toList(),
                    containsInAnyOrder("Audio", "Documents", "Photos", "Videos", "fast.txt")
            );
        } finally {
            executor.shutdown();
        }
    }

    @Test
    void shouldReturnResolverWithCorrectIdentifiersWhenGettingFileDownloadView() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "report.txt",
                TEXT_MIME_TYPE,
                "content".getBytes(StandardCharsets.UTF_8)
        );

        final var resolver = fileNodeService.getFileDownloadViewResolver(userAccountUuid, fileUuid);

        assertThat(resolver, is(notNullValue()));
        assertThat(resolver.getUserAccountUuid(), is(userAccountUuid));
        assertThat(resolver.getFileNodeUuid(), is(fileUuid));
    }

    @Test
    void shouldExposeDecryptedContentStreamFromFileDownloadView() {
        seedUser();
        final var content = "decrypt me".getBytes(StandardCharsets.UTF_8);
        final var fileUuid = uploadFile(rootDirectoryUuid, "decrypt.txt", TEXT_MIME_TYPE, content);
        final var resolver = fileNodeService.getFileDownloadViewResolver(userAccountUuid, fileUuid);

        // FileDownloadViewMessageBodyWriter is what opens a transaction in production. The resolver
        // lazy-fetches the FileNode and reads the encrypted Blob, both of which require an active
        // transaction. We mirror the writer's behaviour here.
        QuarkusTransaction.requiringNew().run(() -> {
            try {
                final var fileDownloadView = resolver.getFileDownloadView();
                try (final var inputStream = fileDownloadView.contentInputStream()) {
                    final var decrypted = inputStream.readAllBytes();
                    assertThat(decrypted, equalTo(content));
                }
                assertThat(fileDownloadView.filename(), is("decrypt.txt"));
                assertThat(fileDownloadView.mimeType(), is(TEXT_MIME_TYPE));
                assertThat(fileDownloadView.sizeBytes(), is((long) content.length));
            } catch (java.io.IOException ex) {
                throw new AssertionError("failed to read decrypted stream", ex);
            }
        });
    }

    @Test
    void shouldUpdateNameWhenRenamingFile() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "old.txt",
                TEXT_MIME_TYPE,
                "old contents".getBytes(StandardCharsets.UTF_8)
        );

        final var view = fileNodeService.renameFile(
                userAccountUuid,
                fileUuid,
                new RenameFileNodeRequest("renamed.txt")
        );

        assertThat(
                view.childrenFileNodeViews().stream().anyMatch(child -> child.name().equals("renamed.txt") && !child.directory()),
                is(true)
        );
    }

    @Test
    void shouldThrowFileNameRequiredWhenRenamingFileWithBlankName() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "old.txt",
                TEXT_MIME_TYPE,
                "x".getBytes(StandardCharsets.UTF_8)
        );

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameFile(
                        userAccountUuid,
                        fileUuid,
                        new RenameFileNodeRequest("    ")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NAME_REQUIRED));
    }

    @Test
    void shouldThrowFileNotFoundWhenRenamingFileByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameFile(
                        userAccountUuid,
                        UUID.randomUUID(),
                        new RenameFileNodeRequest("renamed.txt")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NOT_FOUND));
    }

    @Test
    void shouldThrowFileNameNotUniqueWhenSiblingExistsWithSameNameAndMimeType() {
        seedUser();
        uploadFile(rootDirectoryUuid, "alpha.txt", TEXT_MIME_TYPE, "a".getBytes(StandardCharsets.UTF_8));
        final var betaUuid = uploadFile(rootDirectoryUuid, "beta.txt", TEXT_MIME_TYPE, "b".getBytes(StandardCharsets.UTF_8));

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameFile(
                        userAccountUuid,
                        betaUuid,
                        new RenameFileNodeRequest("alpha.txt")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NAME_NOT_UNIQUE));
    }

    @Test
    void shouldRemoveFileWhenDeleting() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "trash.txt",
                TEXT_MIME_TYPE,
                "x".getBytes(StandardCharsets.UTF_8)
        );

        final var view = fileNodeService.deleteFile(userAccountUuid, fileUuid);

        assertThat(
                view.childrenFileNodeViews().stream().noneMatch(child -> child.name().equals("trash.txt")),
                is(true)
        );
    }

    @Test
    void shouldThrowFileNotFoundWhenDeletingByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.deleteFile(userAccountUuid, UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NOT_FOUND));
    }

    @Test
    void shouldReturnMetadataWhenGettingFileProperties() {
        seedUser();
        final var content = "abcdefghij".getBytes(StandardCharsets.UTF_8);
        final var fileUuid = uploadFile(rootDirectoryUuid, "info.txt", TEXT_MIME_TYPE, content);

        final var properties = fileNodeService.getFileProperties(userAccountUuid, fileUuid);

        assertThat(properties.uuid(), is(fileUuid));
        assertThat(properties.name(), is("info.txt"));
        assertThat(properties.mimeType(), is(TEXT_MIME_TYPE));
        assertThat(properties.sizeBytes(), is((long) content.length));
        assertThat(properties.parentUuid(), is(rootDirectoryUuid));
        assertThat(properties.parentName(), is("Root"));
        assertThat(properties.createdAt(), is(notNullValue()));
        assertThat(properties.lastModifiedAt(), is(notNullValue()));
    }

    @Test
    void shouldThrowFileNotFoundWhenGettingFilePropertiesByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.getFileProperties(userAccountUuid, UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.FILE_NOT_FOUND));
    }

    @Test
    void shouldDispatchToRenameDirectoryWhenRenamingFileNodeTargetingDirectory() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var view = fileNodeService.renameFileNode(
                userAccountUuid,
                workspaceUuid,
                new RenameFileNodeRequest("WorkspaceRenamed")
        );

        assertThat(
                view.childrenFileNodeViews().stream().anyMatch(child -> child.name().equals("WorkspaceRenamed") && child.directory()),
                is(true)
        );
    }

    @Test
    void shouldDispatchToRenameFileWhenRenamingFileNodeTargetingFile() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "old.txt",
                TEXT_MIME_TYPE,
                "x".getBytes(StandardCharsets.UTF_8)
        );

        final var view = fileNodeService.renameFileNode(
                userAccountUuid,
                fileUuid,
                new RenameFileNodeRequest("renamed.txt")
        );

        assertThat(
                view.childrenFileNodeViews().stream().anyMatch(child -> child.name().equals("renamed.txt") && !child.directory()),
                is(true)
        );
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenRenamingFileNodeByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.renameFileNode(
                        userAccountUuid,
                        UUID.randomUUID(),
                        new RenameFileNodeRequest("anything")
                )
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldDispatchToDeleteDirectoryWhenDeletingFileNodeTargetingDirectory() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var view = fileNodeService.deleteFileNode(userAccountUuid, workspaceUuid);

        assertThat(
                view.childrenFileNodeViews().stream().noneMatch(child -> child.name().equals("Workspace")),
                is(true)
        );
    }

    @Test
    void shouldDispatchToDeleteFileWhenDeletingFileNodeTargetingFile() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "doomed.txt",
                TEXT_MIME_TYPE,
                "x".getBytes(StandardCharsets.UTF_8)
        );

        final var view = fileNodeService.deleteFileNode(userAccountUuid, fileUuid);

        assertThat(
                view.childrenFileNodeViews().stream().noneMatch(child -> child.name().equals("doomed.txt")),
                is(true)
        );
    }

    @Test
    void shouldThrowDirectoryNotFoundWhenDeletingFileNodeByUnknownUuid() {
        seedUser();

        final var businessException = assertThrows(
                BusinessException.class,
                () -> fileNodeService.deleteFileNode(userAccountUuid, UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.DIRECTORY_NOT_FOUND));
    }

    @Test
    void shouldDispatchToDirectoryPropertiesWhenGettingFileNodePropertiesForDirectory() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        final var properties = fileNodeService.getFileNodePropertiesView(userAccountUuid, workspaceUuid);

        assertThat(properties, is(notNullValue()));
        assertThat(properties, is(org.hamcrest.Matchers.instanceOf(DirectoryPropertiesView.class)));
    }

    @Test
    void shouldDispatchToFilePropertiesWhenGettingFileNodePropertiesForFile() {
        seedUser();
        final var fileUuid = uploadFile(
                rootDirectoryUuid,
                "props.txt",
                TEXT_MIME_TYPE,
                "x".getBytes(StandardCharsets.UTF_8)
        );

        final var properties = fileNodeService.getFileNodePropertiesView(userAccountUuid, fileUuid);

        assertThat(properties, is(org.hamcrest.Matchers.instanceOf(FilePropertiesView.class)));
    }

    @Test
    void shouldReflectAncestorChainInBreadcrumbs() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");
        final var subfolderUuid = createDirectory(workspaceUuid, "Subfolder");

        final var view = fileNodeService.getDirectoryContents(userAccountUuid, subfolderUuid);

        assertThat(view.breadcrumbViews(), hasSize(3));
        assertThat(
                view.breadcrumbViews().stream().map(BreadcrumbView::name).toList(),
                contains("Root", "Workspace", "Subfolder")
        );
        assertThat(view.parentUuid(), is(workspaceUuid));
    }

    @Test
    void shouldOrderChildrenByDefaultComparatorWhenGettingDirectoryContents() {
        seedUser();
        final var workspaceUuid = createDirectory(rootDirectoryUuid, "Workspace");

        uploadFile(workspaceUuid, "delta.txt", TEXT_MIME_TYPE, "d".getBytes(StandardCharsets.UTF_8));
        createDirectory(workspaceUuid, "Beta");
        uploadFile(workspaceUuid, "alpha.txt", TEXT_MIME_TYPE, "a".getBytes(StandardCharsets.UTF_8));
        createDirectory(workspaceUuid, "Alpha");
        uploadFile(workspaceUuid, "bravo.txt", TEXT_MIME_TYPE, "b".getBytes(StandardCharsets.UTF_8));
        createDirectory(workspaceUuid, "beta");
        uploadFile(workspaceUuid, "BRAVO.txt", TEXT_MIME_TYPE, "b".getBytes(StandardCharsets.UTF_8));

        final var view = fileNodeService.getDirectoryContents(userAccountUuid, workspaceUuid);

        assertThat(
                view.childrenFileNodeViews().stream().map(FileNodeView::name).toList(),
                contains("Alpha", "Beta", "beta", "BRAVO.txt", "alpha.txt", "bravo.txt", "delta.txt")
        );
    }

    @Test
    void shouldAccumulateTowardsTotalSizeWhenUploadingFiles() {
        seedUser();
        uploadFile(rootDirectoryUuid, "one.txt", TEXT_MIME_TYPE, new byte[100]);
        uploadFile(rootDirectoryUuid, "two.txt", TEXT_MIME_TYPE, new byte[200]);

        final var properties = fileNodeService.getDirectoryProperties(userAccountUuid, rootDirectoryUuid);

        assertThat(properties.fileCount(), is(greaterThanOrEqualTo(2L)));
        assertThat(properties.totalSizeBytes(), is(greaterThanOrEqualTo(300L)));
    }

    private void seedUser() {
        seedUser(DEFAULT_MAX_STORAGE_BYTES, DEFAULT_MAX_FILE_UPLOAD_BYTES);
    }

    private void seedUser(long maxStorageBytes,
                          long maxFileUploadBytes) {
        QuarkusTransaction.requiringNew().run(() -> {
            final var seedInstant = Instant.now();
            final var userAccount = new UserAccount()
                    .setFirstName("Test")
                    .setLastName("User")
                    .setCreatedAt(seedInstant)
                    .setLastModifiedAt(seedInstant);
            final var rootFileNode = FileNode.createDirectory(userAccount, "Root");
            final var userStorage = new UserStorage()
                    .setUserAccount(userAccount)
                    .setMaxStorageBytes(maxStorageBytes)
                    .setMaxFileUploadBytes(maxFileUploadBytes)
                    .setRootFileNode(rootFileNode);
            userAccount.setUserStorage(userStorage);
            entityManager.persist(userAccount);
            entityManager.flush();
            userAccountUuid = userAccount.getUuid();
            rootDirectoryUuid = rootFileNode.getUuid();
        });
        for (final var defaultName : new String[] {"Audio", "Documents", "Photos", "Videos"}) {
            fileNodeService.createDirectory(
                    userAccountUuid,
                    new CreateDirectoryRequest(defaultName, rootDirectoryUuid)
            );
        }
    }

    private UUID createDirectory(UUID parentUuid,
                                 String name) {
        final var view = fileNodeService.createDirectory(
                userAccountUuid,
                new CreateDirectoryRequest(name, parentUuid)
        );
        return view.childrenFileNodeViews().stream()
                .filter(child -> child.name().equals(name) && child.directory())
                .map(FileNodeView::uuid)
                .findFirst()
                .orElseThrow(() -> new AssertionError("created directory not found: " + name));
    }

    private UUID uploadFile(UUID parentUuid,
                            String name,
                            String mimeType,
                            byte[] content) {
        final var view = fileNodeService.uploadFile(
                userAccountUuid,
                parentUuid,
                name,
                mimeType,
                new ByteArrayInputStream(content)
        );
        final var uuid = view.childrenFileNodeViews()
                .stream()
                .filter(child -> child.name().equals(name) && !child.directory())
                .map(FileNodeView::uuid)
                .findFirst()
                .orElse(null);
        assertThat(uuid, is(notNullValue()));
        return uuid;
    }

    private static final class InitialDelayInputStream extends InputStream {

        private final InputStream delegate;
        private final long initialDelayMillis;
        private boolean delayed;

        InitialDelayInputStream(InputStream delegate, long initialDelayMillis) {
            this.delegate = delegate;
            this.initialDelayMillis = initialDelayMillis;
            this.delayed = false;
        }

        @Override
        public int read() throws IOException {
            applyDelayOnce();
            return delegate.read();
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            applyDelayOnce();
            return delegate.read(buffer, offset, length);
        }

        private void applyDelayOnce() throws IOException {
            if (delayed) {
                return;
            }
            delayed = true;
            try {
                Thread.sleep(initialDelayMillis);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IOException("interrupted", ex);
            }
        }
    }
}
