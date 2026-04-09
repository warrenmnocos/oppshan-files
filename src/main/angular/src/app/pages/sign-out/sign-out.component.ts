import {Component, inject, OnInit} from '@angular/core';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-sign-out',
  template: '',
})
export class SignOut implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.signOut();
  }
}