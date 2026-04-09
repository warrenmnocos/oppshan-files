import {Component, inject, OnInit, signal} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {UserAccountView} from '../../models/user-account-view';

@Component({
  selector: 'app-root-directory',
  templateUrl: './root-directory.html',
})
export class RootDirectory implements OnInit {
  protected user = signal<UserAccountView | null>(null);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => this.user.set(user));
  }
}
