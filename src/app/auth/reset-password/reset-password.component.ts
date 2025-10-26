import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PasswordResetService } from '../../core/services/password-reset.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage, PASSWORD_RESET_ERRORS, PasswordResetErrorCode } from '../../core/models/password-reset.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  isLoading = false;
  isTokenValid = false;
  tokenValidated = false;
  isSuccess = false;
  token: string | null = null;
  email: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Obtener token de la URL
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.toastService.showError('Enlace de recuperación inválido o incompleto');
      this.router.navigate(['/forgot-password']);
      return;
    }

    // Validar token antes de mostrar el formulario
    this.validateToken();
  }

  passwordMatchValidator(formGroup: FormGroup): { [key: string]: boolean } | null {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  validateToken(): void {
    if (!this.token) return;

    this.isLoading = true;

    this.passwordResetService.validateToken(this.token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.tokenValidated = true;

        if (response.valid) {
          this.isTokenValid = true;
          this.email = response.email || null;
        } else {
          this.isTokenValid = false;
          let errorMessage = 'El enlace de recuperación no es válido';

          if (response.code && Object.values(PASSWORD_RESET_ERRORS).includes(response.code as any)) {
            errorMessage = getErrorMessage(response.code as PasswordResetErrorCode);
          } else if (response.message) {
            errorMessage = response.message;
          }

          this.toastService.showError(errorMessage);

          // Redirigir según el tipo de error
          if (response.code === PASSWORD_RESET_ERRORS.TOKEN_EXPIRED ||
              response.code === PASSWORD_RESET_ERRORS.TOKEN_ALREADY_USED) {
            setTimeout(() => {
              this.router.navigate(['/forgot-password']);
            }, 3000);
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.tokenValidated = true;
        this.isTokenValid = false;

        let errorMessage = 'Error al validar el enlace de recuperación';

        if (error.error?.code && Object.values(PASSWORD_RESET_ERRORS).includes(error.error.code as any)) {
          errorMessage = getErrorMessage(error.error.code as PasswordResetErrorCode);
        } else if (error.status === 404) {
          errorMessage = 'El enlace de recuperación no existe o ha expirado';
        }

        this.toastService.showError(errorMessage);

        setTimeout(() => {
          this.router.navigate(['/forgot-password']);
        }, 3000);
      }
    });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.token) {
      return;
    }

    this.isLoading = true;
    const password = this.resetPasswordForm.get('password')?.value;
    const confirmPassword = this.resetPasswordForm.get('confirmPassword')?.value;

    this.passwordResetService.resetPassword(this.token, password, confirmPassword).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.code === 'PASSWORD_RESET_SUCCESS') {
          this.isSuccess = true;
          this.toastService.showSuccess('Contraseña restablecida exitosamente');

          // Limpiar sessionStorage si existe
          sessionStorage.removeItem('resetEmail');
        } else {
          this.toastService.showError(response.message || 'Ocurrió un error al restablecer la contraseña');
        }
      },
      error: (error) => {
        this.isLoading = false;

        // Manejar errores específicos del backend
        let errorMessage = 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';

        if (error.error?.code) {
          errorMessage = getErrorMessage(error.error.code);
        } else if (error.status === 400) {
          errorMessage = 'Datos inválidos. Por favor, verifica la información.';
        }

        this.toastService.showError(errorMessage);
      }
    });
  }

  get password() {
    return this.resetPasswordForm.get('password');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  get passwordErrorMessage(): string {
    const passwordControl = this.password;

    if (passwordControl?.hasError('required') && passwordControl?.touched) {
      return 'La contraseña es requerida';
    }

    if (passwordControl?.hasError('minlength') && passwordControl?.touched) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }

    if (passwordControl?.hasError('pattern') && passwordControl?.touched) {
      return 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)';
    }

    return '';
  }

  get confirmPasswordErrorMessage(): string {
    const confirmPasswordControl = this.confirmPassword;

    if (confirmPasswordControl?.hasError('required') && confirmPasswordControl?.touched) {
      return 'La confirmación de contraseña es requerida';
    }

    if (this.resetPasswordForm.hasError('passwordMismatch') && confirmPasswordControl?.touched) {
      return 'Las contraseñas no coinciden';
    }

    return '';
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  isPasswordValid(criteria: string): boolean {
    const password = this.password?.value || '';
    switch (criteria) {
      case 'length':
        return password.length >= 8;
      case 'uppercase':
        return /[A-Z]/.test(password);
      case 'lowercase':
        return /[a-z]/.test(password);
      case 'number':
        return /\d/.test(password);
      case 'special':
        return /[@$!%*?&]/.test(password);
      default:
        return false;
    }
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}