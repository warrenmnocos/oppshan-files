import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
})
export class Landing implements OnInit {
  protected errorMessage = signal<string | null>(null);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error) {
      this.errorMessage.set('Sign in failed. Please try again.');
    }
  }

  signIn(): void {
    const tenant = this.route.snapshot.queryParamMap.get('tenant') ?? 'google';
    window.location.href = `/api/auth/login/${tenant}`;
  }
}
