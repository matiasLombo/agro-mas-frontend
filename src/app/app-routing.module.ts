import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { MarketplaceComponent } from './marketplace/marketplace.component';
import { AuthGuard } from './core/guards/auth.guard';
import { SellerGuard } from './core/guards/role.guard';
import { ProductFormComponent } from './product-form/product-form.component';


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
  { path: 'product', component: ProductFormComponent }, // <-- Esta es la ruta
  { path: 'product/:id', component: ProductFormComponent }, // Product detail route
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
