import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-dashboard-page',
  template: `
    <section class="dashboard">
      <h1>Dashboard</h1>

      @if (auth.user(); as user) {
        <p><strong>Aktueller User:</strong> {{ user.email }}</p>
      }

      <h2>Aktive Rollen</h2>
      @if (auth.roleKeys().length > 0) {
        <ul>
          @for (role of auth.roleKeys(); track role) {
            <li>{{ role }}</li>
          }
        </ul>
      } @else {
        <p>Keine Rolle gefunden.</p>
      }
    </section>
  `,
  styles: `
    .dashboard {
      max-width: 50rem;
      margin: 2rem auto;
      padding: 1rem;
    }

    h1 {
      margin: 0 0 0.75rem;
    }

    h2 {
      margin: 1rem 0 0.4rem;
      font-size: 1.05rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly auth = inject(AuthService);
}
