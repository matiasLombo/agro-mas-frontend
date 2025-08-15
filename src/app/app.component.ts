import { Component, OnInit } from '@angular/core';
import { ApiTestService } from './services/api-test.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Agro Mas Frontend';
  backendStatus = 'Verificando...';
  backendConnected = false;

  constructor(private apiTestService: ApiTestService) {}

  ngOnInit() {
    this.testBackendConnection();
  }

  testBackendConnection() {
    this.apiTestService.testBackendConnection().subscribe({
      next: (response) => {
        this.backendStatus = '✅ Backend conectado correctamente';
        this.backendConnected = true;
      },
      error: (error) => {
        this.backendStatus = '❌ Error conectando con backend';
        this.backendConnected = false;
        console.error('Backend connection error:', error);
      }
    });
  }
}
