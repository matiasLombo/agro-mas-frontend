import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Custom error interface that preserves backend error information
 */
export interface CustomHttpError extends Error {
  status: number;
  statusText: string;
  code: string;
  originalError: any;
  url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // GET request
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  // POST request
  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // PUT request
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // DELETE request
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  private getHeaders(): HttpHeaders {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return new HttpHeaders(headers);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Ha ocurrido un error inesperado';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
      errorCode = 'CLIENT_ERROR';
    } else {
      // Server-side error - preserve backend error structure
      // First try to get the error message from backend response
      if (error.error?.error && typeof error.error.error === 'string') {
        errorMessage = error.error.error;
      } else if (error.error?.message && typeof error.error.message === 'string') {
        errorMessage = error.error.message;
      } else {
        // Fallback to status-based messages
        switch (error.status) {
          case 400:
            errorMessage = 'Solicitud inválida. Verifica los datos ingresados';
            break;
          case 401:
            errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente';
            errorCode = 'UNAUTHORIZED';
            // Clear token and redirect to login
            localStorage.removeItem('authToken');
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción';
            errorCode = 'FORBIDDEN';
            break;
          case 404:
            errorMessage = 'Recurso no encontrado';
            errorCode = 'NOT_FOUND';
            break;
          case 409:
            errorMessage = 'Conflicto: Los datos ingresados ya existen en el sistema';
            errorCode = 'CONFLICT';
            break;
          case 500:
            errorMessage = 'Error interno del servidor. Intenta nuevamente más tarde';
            errorCode = 'SERVER_ERROR';
            break;
          default:
            errorMessage = error.message || `Error del servidor: ${error.status}`;
        }
      }

      // Get error code from backend if available
      if (error.error?.code) {
        errorCode = error.error.code;
      }
    }

    console.error('HTTP Error:', error);

    // Create a custom error object that preserves all information
    const customError: any = new Error(errorMessage);
    customError.status = error.status;
    customError.statusText = error.statusText;
    customError.code = errorCode;
    customError.originalError = error.error; // Preserve original backend response
    customError.url = error.url;

    return throwError(() => customError);
  }

  // Health check method
  healthCheck(): Observable<any> {
    const healthUrl = `${this.baseUrl.replace('/api/v1', '')}/health`;
    return this.http.get(healthUrl).pipe(
      catchError(this.handleError)
    );
  }

  // Environment check method
  environmentCheck(): Observable<any> {
    const envUrl = `${this.baseUrl.replace('/api/v1', '')}/env`;
    return this.http.get(envUrl).pipe(
      catchError(this.handleError)
    );
  }
}
