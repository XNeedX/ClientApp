import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'onboarding',
        canActivate: [authGuard],
    },
    {
        path: 'doctors',
        canActivate: [authGuard],
        data: { roles: ['Patient'] }
    }
];
