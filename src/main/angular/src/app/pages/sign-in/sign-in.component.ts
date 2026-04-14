import {Component, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {MessageCode} from '../../models/message-code';
import {AuthService} from '../../services/auth-service.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  imports: [TranslatePipe],
})
export class SignIn implements OnInit {

  protected errorKey = signal<MessageCode | null>(null);

  constructor(private readonly authService: AuthService,
              private readonly route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const message = this.route.snapshot.queryParamMap.get('message');
    if (message) {
      this.errorKey.set(Object.values(MessageCode).find(code => code === message) ?? MessageCode.Unknown);
    }
  }

  signIn(): void {
    this.authService.signIn(this.route.snapshot.queryParamMap.get('tenant') ?? 'google');
  }
}
