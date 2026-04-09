import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {AuthService} from '../../services/auth.service';
import {UserAccountView} from '../../models/user-account-view';
import {Toolbar} from '../../components/toolbar/toolbar.component';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [Toolbar, TranslatePipe],
})
export class Home implements OnInit, OnDestroy {
  protected userAccountView = signal<UserAccountView | null>(null);
  private authService = inject(AuthService);
  private userSubscription!: Subscription;

  ngOnInit(): void {
    this.userSubscription = this.authService.getCurrentUser()
      .subscribe(userAccountView => this.userAccountView.set(userAccountView));
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  onSignOut(): void {
    window.location.href = '/sign-out'
  }
}
