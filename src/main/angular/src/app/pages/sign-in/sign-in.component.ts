import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  imports: [TranslatePipe],
})
export class SignIn implements OnInit {
  protected hasError = signal(false);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('error')) {
      this.hasError.set(true);
    }
  }

  signIn(): void {
    const tenant = this.route.snapshot.queryParamMap.get('tenant') ?? 'google';
    window.location.href = `/api/auth/login/${tenant}`;
  }
}
