import { Component, OnInit } from '@angular/core';
import { ApiTestService } from './services/api-test.service';
import { AuthService } from './core/services/auth.service';
import { User } from './core/models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Agro Mas';
  backendStatus = 'Verificando...';
  backendConnected = false;
  backendEnvironment = '';
  environmentInfo: any = null;

  // Auth properties
  isAuthenticated$: Observable<boolean>;
  currentUser$: Observable<User | null>;

  constructor(
    private apiTestService: ApiTestService,
    private authService: AuthService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.testBackendConnection();
    this.testBackendEnvironment();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }

  get currentUser(): User | null {
    return this.authService.currentUser;
  }

  logout(): void {
    this.authService.logout();
  }

  testBackendConnection() {
    this.apiTestService.testBackendConnection().subscribe({
      next: (response) => {
        this.backendStatus = '✅ Backend conectado correctamente';
        this.backendConnected = true;
        console.log('Backend health:', response);
      },
      error: (error) => {
        this.backendStatus = '❌ Error conectando con backend (CORS/Network)';
        this.backendConnected = false;
        console.error('Backend connection error:', error);
      }
    });
  }

  testBackendEnvironment() {
    this.apiTestService.testBackendEnvironment().subscribe({
      next: (response) => {
        this.backendEnvironment = response.environment || 'Unknown';
        this.environmentInfo = response;
        console.log('Backend environment:', response);
      },
      error: (error) => {
        this.backendEnvironment = 'Error';
        console.error('Backend environment error:', error);
      }
    });
  }
}
