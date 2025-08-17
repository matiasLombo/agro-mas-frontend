import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatIconModule } from '@angular/material/icon';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Auth Components
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

// Marketplace Components
import { MarketplaceComponent } from './marketplace/marketplace.component';

// Services
import { AuthService } from './core/services/auth.service';
import { HttpService } from './core/services/http.service';
import { ProductService } from './core/services/product.service';

// Guards
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard, SellerGuard } from './core/guards/role.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    MarketplaceComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatIconModule
  ],
  providers: [
    AuthService,
    HttpService,
    ProductService,
    AuthGuard,
    RoleGuard,
    SellerGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
