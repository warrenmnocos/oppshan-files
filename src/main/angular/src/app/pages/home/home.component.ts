import {Component, OnDestroy, OnInit, signal} from '@angular/core';
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
export class Home implements OnInit, OnDestroy {

  protected userAccountView = signal<UserAccountView | null>(null);

  protected directoryContentsView = signal<DirectoryContentsView | null>(null);

  private userSubscription!: Subscription;

  private directorySubscription?: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly fileService: FileService,
  ) {
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.getCurrentUser()
      .subscribe(userAccountView => this.loadUserAccountView(userAccountView));
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.directorySubscription?.unsubscribe();
  }

  onSignOut(): void {
    window.location.href = '/sign-out';
  }

  onNavigateToDirectory(uuid: string): void {
    this.loadDirectory(uuid);
  }

  private loadUserAccountView(userAccountView: UserAccountView | null) {
    this.userAccountView.set(userAccountView);
    if (userAccountView) {
      this.loadDirectory(userAccountView.rootFileNodeUuid);
    }
  }

  private loadDirectory(uuid: string): void {
    this.directorySubscription?.unsubscribe();
    this.directorySubscription = this.fileService.getDirectoryContents(uuid)
      .subscribe(directoryContentsView => this.directoryContentsView.set(directoryContentsView));
  }
}
