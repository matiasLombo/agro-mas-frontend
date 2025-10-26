import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  PasswordResetResponse,
  PasswordResetTokenValidation,
  PasswordResetStats
} from '../models/password-reset.model';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private readonly apiUrl = `${environment.apiUrl}/password-reset`;

  constructor(private http: HttpClient) {}

  /**
   * Solicitar un restablecimiento de contraseña
   */
  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    const request: PasswordResetRequest = { email };
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/forgot`, request);
  }

  /**
   * Restablecer la contraseña con un token
   */
  resetPassword(token: string, password: string, confirmPassword: string): Observable<PasswordResetResponse> {
    const request: PasswordResetConfirmRequest = {
      token,
      new_password: password,
      confirm_password: confirmPassword
    };
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/reset`, request);
  }

  /**
   * Validar un token de recuperación
   */
  validateToken(token: string): Observable<PasswordResetTokenValidation> {
    return this.http.get<PasswordResetTokenValidation>(`${this.apiUrl}/validate/${token}`);
  }

  /**
   * Obtener estadísticas del sistema de recuperación de contraseña (admin)
   */
  getStats(): Observable<PasswordResetStats> {
    return this.http.get<PasswordResetStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Limpiar tokens expirados (admin)
   */
  cleanupExpiredTokens(): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/cleanup`, {});
  }

  /**
   * Verificar salud del servicio de recuperación de contraseña
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}