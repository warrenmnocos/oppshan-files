import {Component, inject, OnInit, signal} from '@angular/core';
import {AuthService, UserAccount} from '../../core/auth.service';

@Component({
  selector: 'app-root-directory',
  templateUrl: './root-directory.html',
})
export class RootDirectory implements OnInit {
  protected user = signal<UserAccount | null>(null);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => this.user.set(user));
  }
}
