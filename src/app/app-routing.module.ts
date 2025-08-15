import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Componente temporal para rutas
import { Component } from '@angular/core';

@Component({
  template: '<h2>Bienvenido al Marketplace Agro Mas</h2><p>Aplicación en desarrollo...</p>'
})
export class HomeComponent {}

@Component({
  template: '<h2>Login</h2><p>Página de login en desarrollo...</p>'
})
export class LoginComponent {}

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'auth', component: LoginComponent },
  { path: 'marketplace', component: HomeComponent },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  declarations: [HomeComponent, LoginComponent],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
