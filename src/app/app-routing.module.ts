import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { MarketplaceComponent } from './marketplace/marketplace.component';
import { AuthGuard } from './core/guards/auth.guard';
import { SellerGuard } from './core/guards/role.guard';


const routes: Routes = [
  { path: '', redirectTo: '/marketplace', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'marketplace', 
    component: MarketplaceComponent
    // Sin AuthGuard - acceso público
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
  { path: '**', redirectTo: '/marketplace' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
