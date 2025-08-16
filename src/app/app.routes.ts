import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    // { path: 'home', component: HomeComponent },
    // { path: 'auth', component: LoginComponent },
    // { path: 'marketplace', component: HomeComponent },
    { path: '**', redirectTo: '/home' }
];
