import {AfterViewInit, Component, model, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '../../services/auth-service.service';
import {FileService} from '../../services/file-service.service';
import {UserAccountView} from '../../models/user-account-view';
import {MessageCode} from '../../models/message-code';
import {FileNodeView} from '../../models/file-node-view';
import {DirectoryPropertiesView} from '../../models/directory-properties-view';
import {Toolbar} from '../../components/toolbar/toolbar.component';
import {Breadcrumb} from '../../components/breadcrumb/breadcrumb.component';
import {FileBrowser} from '../../components/file-browser/file-browser.component';
import {ErrorState} from '../../components/error-state/error-state.component';
import {DirectoryCreationDialog} from '../../components/directory-creation-dialog/directory-creation-dialog.component';
import {DirectoryRenameDialog} from '../../components/directory-rename-dialog/directory-rename-dialog.component';
import {DirectoryDeletionDialog} from '../../components/directory-deletion-dialog/directory-deletion-dialog.component';
import {
  DirectoryPropertiesDialog
} from '../../components/directory-properties-dialog/directory-properties-dialog.component';
import {Subscription} from 'rxjs';
import {DirectoryContentsView} from '../../models/directory-contents-view';
import {ApplicationEventType} from '../../models/application-event-type';
import {MessageBusService} from '../../services/message-bus-service';

@Component({
  selector: 'app-drive',
  templateUrl: './drive.component.html',
  styleUrl: './drive.component.scss',
  imports: [Toolbar, Breadcrumb, FileBrowser, ErrorState, DirectoryCreationDialog, DirectoryRenameDialog, DirectoryDeletionDialog, DirectoryPropertiesDialog],
})
export class Drive implements AfterViewInit, OnDestroy {

  protected readonly userAccountView = model<UserAccountView | null>();

  protected readonly directoryContentsView = model<DirectoryContentsView | null>();

  protected readonly loading = model<boolean>(false);

  protected readonly errorMessageCode = model<MessageCode | null>(null);

  protected readonly directoryCreationDialogVisible = model(false);

  protected readonly selectedDirectoryFileNodeView = model<FileNodeView | null>(null);

  protected readonly directoryProperties = model<DirectoryPropertiesView | null>(null);

  protected readonly deletingDirectoryItemCount = model(0);
  protected readonly ApplicationEventType = ApplicationEventType;
  private userSubscription?: Subscription;
  private directorySubscription?: Subscription;
  private urlSubscription?: Subscription;

  constructor(
    readonly messageBusService: MessageBusService,
    private readonly authService: AuthService,
    private readonly fileService: FileService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
  }

  ngAfterViewInit(): void {
    this.loading.set(true);
    this.userSubscription = this.authService.getCurrentUser()
      .subscribe(userAccountView => {
        this.userAccountView.set(userAccountView);
        if (userAccountView) {
          this.subscribeToUrlChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.directorySubscription?.unsubscribe();
    this.urlSubscription?.unsubscribe();
  }

  onSignOut(): void {
    this.authService.signOut();
  }

  onDirectoryNavigation(uuid: string | null): void {
    this.loading.set(true);
    if (!uuid) {
      this.router.navigate(['/drive']);
      return;
    }

    const current = this.directoryContentsView();
    if (!current) {
      return;
    }

    const targetBreadcrumb = current.breadcrumbViews
      .find(b => b.uuid === uuid);
    if (targetBreadcrumb) {
      const rootIndex = 0;
      const targetIndex = current.breadcrumbViews.indexOf(targetBreadcrumb);
      const pathSegments = current.breadcrumbViews
        .slice(rootIndex + 1, targetIndex + 1)
        .map(b => b.name);
      this.router.navigate(['/drive', ...pathSegments]);
      return;
    }

    const targetChild = current.childrenFileNodeViews
      .find(c => c.uuid === uuid);

    if (targetChild) {
      const pathSegments = current.breadcrumbViews
        .slice(1)
        .map(b => b.name);
      pathSegments.push(targetChild.name);
      this.router.navigate(['/drive', ...pathSegments]);
    }
  }

  onDirectoryCreationInitiated(): void {
    this.directoryCreationDialogVisible.set(true);
  }

  onDirectoryCreationConfirmed(name: string): void {
    const currentDir = this.directoryContentsView();
    if (!currentDir) {
      return;
    }

    this.directoryCreationDialogVisible.set(false);
    this.loading.set(true);
    this.fileService.createDirectory(name, currentDir.uuid).subscribe({
      next: directoryContentsView => {
        this.directoryContentsView.set(directoryContentsView);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.loading.set(false);
      },
    });
  }

  onDirectoryCreationCanceled(): void {
    this.directoryCreationDialogVisible.set(false);
  }

  onDirectoryRenameInitiated(directory: FileNodeView): void {
    this.selectedDirectoryFileNodeView.set(directory);
  }

  onDirectoryRenameConfirmed(name: string): void {
    const directory = this.selectedDirectoryFileNodeView();
    if (!directory) {
      return;
    }

    this.selectedDirectoryFileNodeView.set(null);
    this.loading.set(true);
    this.fileService.renameDirectory(directory.uuid, name).subscribe({
      next: directoryContentsView => {
        this.directoryContentsView.set(directoryContentsView);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.loading.set(false);
      },
    });
  }

  onDirectoryRenameCanceled(): void {
    this.selectedDirectoryFileNodeView.set(null);
  }

  onDirectoryDeletionInitiated(directory: FileNodeView): void {
    this.selectedDirectoryFileNodeView.set(directory);
    this.fileService.getDirectoryProperties(directory.uuid).subscribe({
      next: properties => {
        this.deletingDirectoryItemCount.set(properties.directoryCount + properties.fileCount);
      },
    });
  }

  onDirectoryDeletionConfirmed(): void {
    const directory = this.selectedDirectoryFileNodeView();
    if (!directory) {
      return;
    }

    this.selectedDirectoryFileNodeView.set(null);
    this.loading.set(true);
    this.fileService.deleteDirectory(directory.uuid).subscribe({
      next: directoryContentsView => {
        this.directoryContentsView.set(directoryContentsView);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.handleError(error);
        this.loading.set(false);
      },
    });
  }

  onDirectoryDeletionCanceled(): void {
    this.selectedDirectoryFileNodeView.set(null);
  }

  onDirectoryPropertiesInitiated(directory: FileNodeView): void {
    this.fileService.getDirectoryProperties(directory.uuid).subscribe({
      next: properties => {
        this.directoryProperties.set(properties);
      },
    });
  }

  onDirectoryPropertiesCanceled(): void {
    this.directoryProperties.set(null);
  }

  private handleError(error: HttpErrorResponse): void {
    const messageCode = error.error?.messageCode;
    this.errorMessageCode.set(
      Object.values(MessageCode).find(code => code === messageCode) ?? MessageCode.Unknown
    );
  }

  private subscribeToUrlChanges(): void {
    this.loading.set(true);
    this.urlSubscription?.unsubscribe();
    this.urlSubscription = this.route.url
      .subscribe(segments => {
        const path = segments.map(s => decodeURIComponent(s.path)).join('/');
        this.loadDirectoryByPath(path);
      });
  }

  private loadDirectoryByPath(path: string): void {
    this.loading.set(true);
    this.errorMessageCode.set(null);
    this.directorySubscription?.unsubscribe();
    this.directorySubscription = this.fileService.getDirectoryContentsByPath(path)
      .subscribe({
        next: directoryContentsView => {
          this.directoryContentsView.set(directoryContentsView);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.handleError(error);
          this.directoryContentsView.set(null);
          this.loading.set(false);
        },
      });
  }
}
