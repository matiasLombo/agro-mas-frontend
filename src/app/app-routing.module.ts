import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AuthGuard } from './core/guards/auth.guard';
import { SellerGuard } from './core/guards/role.guard';

// Componente temporal para rutas protegidas
import { Component } from '@angular/core';

@Component({
  template: `
    <div style="padding: 40px; text-align: center;">
      <h2>🌾 Marketplace Agropecuario</h2>
      <p>Bienvenido al área protegida del marketplace</p>
      <p><strong>Usuario logueado:</strong> Funcionalidad en desarrollo...</p>
      <div style="margin-top: 20px;">
        <button (click)="logout()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Cerrar Sesión
        </button>
      </div>
    </div>
  `
})
export class MarketplaceComponent {
  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
}

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'marketplace', 
    component: MarketplaceComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'profile', 
    component: MarketplaceComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'products', 
    component: MarketplaceComponent,
    canActivate: [SellerGuard]
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  declarations: [MarketplaceComponent],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
