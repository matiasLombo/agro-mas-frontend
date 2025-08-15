import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class ApiTestService {

  constructor(private httpService: HttpService) {}

  // Test backend connectivity
  testBackendConnection(): Observable<any> {
    return this.httpService.healthCheck();
  }

  // Test API endpoints
  testApiEndpoints(): Observable<any> {
    return this.httpService.get('/products?limit=5');
  }
}
