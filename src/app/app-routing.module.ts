import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { ForgotPasswordComponent } from './auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password/reset-password.component';
import { EmailSentComponent } from './auth/email-sent/email-sent.component';
import { MarketplaceComponent } from './components/marketplace/marketplace.component';
import { AuthGuard } from './core/guards/auth.guard';
import { SellerGuard } from './core/guards/role.guard';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { MyProductsComponent } from './components/my-products/my-products.component';


const routes: Routes = [
  { path: '', redirectTo: '/marketplace', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'email-sent', component: EmailSentComponent },
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
  { path: 'product', component: ProductFormComponent, canActivate: [AuthGuard] }, // Crear nuevo producto
  { path: 'product/:id', component: ProductFormComponent, canActivate: [AuthGuard] }, // Editar producto propio
  { path: 'product-detail/:id', component: ProductDetailComponent }, // Ver producto (público)
  { path: 'my-products', component: MyProductsComponent, canActivate: [AuthGuard] }, // Mis publicaciones
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
