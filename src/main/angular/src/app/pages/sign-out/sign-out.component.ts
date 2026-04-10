import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../services/auth-service.service';

@Component({
  selector: 'app-sign-out',
  template: '',
})
export class SignOut implements OnInit {

  constructor(private readonly authService: AuthService) {
  }

  ngOnInit(): void {
    this.authService.signOut();
  }
}
