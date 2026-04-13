import {AfterViewInit, Component, model, OnDestroy} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from '../../services/auth-service.service';
import {FileService} from '../../services/file-service.service';
import {UserAccountView} from '../../models/user-account-view';
import {Toolbar} from '../../components/toolbar/toolbar.component';
import {Breadcrumb} from '../../components/breadcrumb/breadcrumb.component';
import {FileBrowser} from '../../components/file-browser/file-browser.component';
import {Subscription} from 'rxjs';
import {DirectoryContentsView} from '../../models/directory-contents-view';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [Toolbar, Breadcrumb, FileBrowser],
})
export class Home implements AfterViewInit, OnDestroy {

  protected readonly userAccountView = model<UserAccountView | null>();

  protected readonly directoryContentsView = model<DirectoryContentsView | null>();

  protected readonly loading = model<boolean>(false);

  private userSubscription!: Subscription;

  private directorySubscription?: Subscription;

  private urlSubscription?: Subscription;

  constructor(
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

  onNavigateToDirectory(uuid: string): void {
    this.loading.set(true);
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
    this.directorySubscription?.unsubscribe();
    this.directorySubscription = this.fileService.getDirectoryContentsByPath(path)
      .subscribe({
        next: directoryContentsView => {
          this.directoryContentsView.set(directoryContentsView);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
