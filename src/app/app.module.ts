import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Auth Components
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';

// Services
import { AuthService } from './core/services/auth.service';
import { HttpService } from './core/services/http.service';

// Guards
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard, SellerGuard } from './core/guards/role.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    AuthService,
    HttpService,
    AuthGuard,
    RoleGuard,
    SellerGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
