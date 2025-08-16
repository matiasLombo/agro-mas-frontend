import { Component, OnInit } from '@angular/core';
import { ApiTestService } from './services/api-test.service';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Agro Mas Frontend';
  backendStatus = 'Verificando...';
  backendConnected = false;
  backendEnvironment = '';
  environmentInfo: any = null;

  constructor(private apiTestService: ApiTestService) { }

  ngOnInit() {
    this.testBackendConnection();
    this.testBackendEnvironment();
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
