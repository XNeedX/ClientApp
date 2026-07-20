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
        loadComponent: () => import('./features/patients/onboarding/onboarding').then(m => m.OnboardingComponent)
    },
    {
        path: 'doctors',
        canActivate: [authGuard],
        data: { roles: ['Patient'] },
        loadComponent: () => import('./features/doctors/doctor-list/doctor-list').then(m => m.DoctorList)
    },
    {
        path: 'doctors/:id',
        canActivate: [authGuard],
        data: { roles: ['Patient'] }, 
        loadComponent: () => import('./features/doctors/doctor-details/doctor-details').then(m => m.DoctorDetailsComponent)
    },
    {
    path: 'profile',
    loadComponent: () => import('./features/patients/profiles/profile.component').then(m => m.ProfileComponent)
    }
];