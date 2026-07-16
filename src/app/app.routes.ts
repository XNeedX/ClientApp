import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
    { 
        path: '', 
        redirectTo: 'home', 
        pathMatch: 'full' 
    },
    { 
        path: 'home', 
        component: HomeComponent 
    },
    {
        path: 'services',
        loadComponent: () => import('./features/services/services-list/services-list.component').then(m => m.ServicesListComponent)
    },
    {
        path: 'onboarding',
        canActivate: [authGuard],
        loadComponent: () => import('./features/patients/onboarding/onboarding').then(m => m.Onboarding)
    },
    {
        path: 'doctors',
        canActivate: [authGuard],
        data: { roles: ['Patient'] },
        loadComponent: () => import('./features/doctors/doctor-list/doctor-list').then(m => m.DoctorList)
    }
];