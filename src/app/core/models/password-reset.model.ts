// Password Reset Models
// These interfaces match exactly with the backend API responses

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface PasswordResetResponse {
  message: string;
  code: string;
  details?: string;
  email_sent?: boolean;
  expires_at?: string;
}

export interface PasswordResetTokenValidation {
  valid: boolean;
  user_id?: string;
  email?: string;
  message?: string;
  code?: string;
}

export interface PasswordResetStats {
  total_tokens: number;
  active_tokens: number;
  expired_tokens: number;
  used_tokens: number;
  total_requests_today: number;
  successful_resets_today: number;
}

// Error codes from backend
export const PASSWORD_RESET_ERRORS = {
  EMAIL_REQUIRED: 'EMAIL_REQUIRED',
  INVALID_EMAIL: 'INVALID_EMAIL',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOKEN_REQUIRED: 'TOKEN_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_ALREADY_USED: 'TOKEN_ALREADY_USED',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS'
} as const;

export type PasswordResetErrorCode = typeof PASSWORD_RESET_ERRORS[keyof typeof PASSWORD_RESET_ERRORS];

// Helper functions for error handling
export function isPasswordResetError(error: any): error is PasswordResetErrorCode {
  return Object.values(PASSWORD_RESET_ERRORS).includes(error);
}

export function getErrorMessage(error: PasswordResetErrorCode): string {
  const errorMessages = {
    [PASSWORD_RESET_ERRORS.EMAIL_REQUIRED]: 'El email es requerido',
    [PASSWORD_RESET_ERRORS.INVALID_EMAIL]: 'El email ingresado no es válido',
    [PASSWORD_RESET_ERRORS.USER_NOT_FOUND]: 'No se encontró un usuario con ese email',
    [PASSWORD_RESET_ERRORS.TOKEN_REQUIRED]: 'El token de recuperación es requerido',
    [PASSWORD_RESET_ERRORS.INVALID_TOKEN]: 'El token de recuperación no es válido',
    [PASSWORD_RESET_ERRORS.TOKEN_EXPIRED]: 'El enlace de recuperación ha expirado',
    [PASSWORD_RESET_ERRORS.TOKEN_ALREADY_USED]: 'Este enlace ya fue utilizado',
    [PASSWORD_RESET_ERRORS.PASSWORD_REQUIRED]: 'La contraseña es requerida',
    [PASSWORD_RESET_ERRORS.PASSWORD_TOO_SHORT]: 'La contraseña debe tener al menos 8 caracteres',
    [PASSWORD_RESET_ERRORS.PASSWORD_MISMATCH]: 'Las contraseñas no coinciden',
    [PASSWORD_RESET_ERRORS.TOO_MANY_REQUESTS]: 'Demasiadas solicitudes. Por favor, espere antes de intentar nuevamente'
  };

  return errorMessages[error] || 'Ha ocurrido un error inesperado';
}