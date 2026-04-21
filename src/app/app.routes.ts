import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
	{ path: 'login', component: LoginPageComponent, canActivate: [guestGuard] },
	{ path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'dashboard' },
];
