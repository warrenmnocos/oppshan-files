import {AfterViewInit, Component, model, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from '../../services/auth-service.service';
import {UserAccountView} from '../../models/user-account-view';
import {MessageCode} from '../../models/message-code';
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
import {NotificationCenter} from '../../components/notification-center/notification-center.component';
import {FileRenameDialog} from '../../components/file-rename-dialog/file-rename-dialog.component';
import {FileDeletionDialog} from '../../components/file-deletion-dialog/file-deletion-dialog.component';
import {FilePropertiesDialog} from '../../components/file-properties-dialog/file-properties-dialog.component';
import {Subscription} from 'rxjs';
import {DirectoryContentsView} from '../../models/directory-contents-view';
import {ApplicationEventType} from '../../models/application-event-type';
import {ApplicationEvent} from '../../models/application-event';
import {MessageBusService} from '../../services/message-bus-service';
import {DirectoryNavigationCommand} from '../../models/operation-commands';
import {
  DirectoryContentsViewAwareDirectoryOperationResult,
  DirectoryNavigationFailed
} from '../../models/operation-outcomes';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-drive',
  templateUrl: './drive.component.html',
  styleUrl: './drive.component.scss',
  imports: [
    Toolbar, Breadcrumb, FileBrowser, ErrorState,
    DirectoryCreationDialog, DirectoryRenameDialog, DirectoryDeletionDialog, DirectoryPropertiesDialog,
    FileRenameDialog, FileDeletionDialog, FilePropertiesDialog,
    NotificationCenter,
  ],
})
export class Drive implements AfterViewInit, OnDestroy {

  protected readonly userAccountView = model<UserAccountView | null>();

  protected readonly directoryContentsView = model<DirectoryContentsView | null>();

  protected readonly loading = model<boolean>(false);

  protected readonly errorMessageCode = model<MessageCode | null>(null);

  protected readonly ApplicationEventType = ApplicationEventType;

  private currentPath?: string | null = null;
  private userSubscription?: Subscription;
  private urlSubscription?: Subscription;
  private applicationEventSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  constructor(
    readonly messageBusService: MessageBusService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
  }

  ngAfterViewInit(): void {
    this.loading.set(true);
    this.applicationEventSubscription = this.messageBusService.applicationEventStream
      .subscribe(event => this.handleApplicationEvent(event));
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
    this.urlSubscription?.unsubscribe();
    this.applicationEventSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
  }

  private handleApplicationEvent(event: ApplicationEvent): void {
    switch (event.type) {
      case ApplicationEventType.DirectoryCreateSucceeded:
      case ApplicationEventType.DirectoryRenameSucceeded:
      case ApplicationEventType.DirectoryNavigationSucceeded:
      case ApplicationEventType.FileRenameSucceeded:
        this.loadDirectoryContents(event.payload as DirectoryContentsViewAwareDirectoryOperationResult);
        break;
      case ApplicationEventType.DirectoryDeletionSucceeded:
      case ApplicationEventType.FileDeletionSucceeded:
        this.loadDirectoryContents(event.payload as DirectoryContentsViewAwareDirectoryOperationResult);
        this.refreshUserAccount();
        break;
      case ApplicationEventType.FileCreateSucceeded:
        this.loadDirectoryContents(event.payload as DirectoryContentsViewAwareDirectoryOperationResult);
        this.refreshUserAccount();
        break;
      case ApplicationEventType.DirectoryNavigationFailed:
        this.handleDirectoryNavigationFailure(event.payload as DirectoryNavigationFailed);
        break;
    }
  }

  private loadDirectoryByPath(path: string | null | undefined): void {
    if (this.currentPath === path) {
      return;
    }

    this.loadDirectoryByPathForcibly(path);
  }

  private loadDirectoryByPathForcibly(path: string | null | undefined): void {
    this.loading.set(true);
    this.errorMessageCode.set(null);
    this.messageBusService.fireApplicationEvent(new ApplicationEvent(
      ApplicationEventType.DirectoryNavigationInitiated,
      {
        path: path,
      } as DirectoryNavigationCommand
    ));
  }

  private async loadDirectoryContents(directoryContentsViewAwareDirectoryOperationResult: DirectoryContentsViewAwareDirectoryOperationResult) {
    this.directoryContentsView.set(directoryContentsViewAwareDirectoryOperationResult.directoryContentsView);
    this.currentPath = directoryContentsViewAwareDirectoryOperationResult.directoryContentsView.breadcrumbViews
      .slice(1)
      .map(breadcrumbView => breadcrumbView.name)
      .join("/");
    await this.router.navigate(['/drive', this.currentPath]);
    this.loading.set(false);
  }

  private handleDirectoryNavigationFailure(directoryNavigationFailed: DirectoryNavigationFailed): void {
    this.errorMessageCode.set(directoryNavigationFailed.messageCode);
    this.directoryContentsView.set(null);
    this.currentPath = directoryNavigationFailed.path ?? null;
    this.loading.set(false);
  }

  private subscribeToUrlChanges(): void {
    this.urlSubscription?.unsubscribe()
    this.urlSubscription = this.route.url
      .pipe(
        map(segments => segments.map(segment => decodeURIComponent(segment.path)).join('/'))
      )
      .subscribe(path => this.loadDirectoryByPath(path));
  }

  private refreshUserAccount(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = this.authService.getCurrentUser()
      .subscribe(userAccountView => this.userAccountView.set(userAccountView));
  }
}
