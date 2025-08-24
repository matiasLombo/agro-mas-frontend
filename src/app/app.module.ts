import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatDividerModule } from '@angular/material/divider';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Auth Components
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

// Marketplace Components
import { MarketplaceComponent } from './marketplace/marketplace.component';
// Product Form Component
import { ProductFormComponent } from './product-form/product-form.component';

// Services
import { AuthService } from './core/services/auth.service';
import { HttpService } from './core/services/http.service';
import { ProductService } from './core/services/product.service';

// Guards
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard, SellerGuard } from './core/guards/role.guard';
import { environment } from '@environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    MarketplaceComponent,
    ProductFormComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSidenavModule,
    MatDividerModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressBarModule,

    // Configuración de Firebase
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireStorageModule

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
