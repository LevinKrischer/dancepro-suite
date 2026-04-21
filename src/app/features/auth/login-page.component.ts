import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="auth-card" aria-labelledby="login-title">
      <h1 id="login-title">Login</h1>
      <p class="hint">Melde dich mit deinem Supabase-Testuser an.</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <label for="email">E-Mail</label>
        <input id="email" type="email" formControlName="email" autocomplete="email" />

        <label for="password">Passwort</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
        />

        @if (errorMessage()) {
          <p class="error" role="alert">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="form.invalid || auth.isLoading()">
          @if (auth.isLoading()) {
            <span>Anmeldung...</span>
          } @else {
            <span>Einloggen</span>
          }
        </button>
      </form>
    </section>
  `,
  styles: `
    .auth-card {
      max-width: 28rem;
      margin: 3rem auto;
      padding: 1.25rem;
      border: 1px solid #d4d4d8;
      border-radius: 0.75rem;
      background: #ffffff;
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
    }

    .hint {
      margin: 0 0 1rem;
      color: #52525b;
    }

    form {
      display: grid;
      gap: 0.65rem;
    }

    label {
      font-weight: 600;
      margin-top: 0.35rem;
    }

    input {
      border: 1px solid #a1a1aa;
      border-radius: 0.5rem;
      padding: 0.55rem 0.65rem;
    }

    button {
      margin-top: 0.75rem;
      border: 0;
      border-radius: 0.5rem;
      padding: 0.65rem 0.9rem;
      background: #1d4ed8;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }

    button:disabled {
      background: #93c5fd;
      cursor: not-allowed;
    }

    .error {
      color: #b91c1c;
      margin: 0.25rem 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly auth = inject(AuthService);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.errorMessage.set('');

    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);

      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
      await this.router.navigateByUrl(redirect);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login fehlgeschlagen.';
      this.errorMessage.set(message);
    }
  }
}
