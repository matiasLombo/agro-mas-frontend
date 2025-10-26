import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetService } from '../../core/services/password-reset.service';
import { ToastService } from '../../core/services/toast.service';
import { getErrorMessage, PASSWORD_RESET_ERRORS } from '../../core/models/password-reset.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  isSubmitted = false;
  isSuccess = false;

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid || this.isLoading || this.isSuccess) {
      return;
    }

    this.isLoading = true;
    const email = this.forgotPasswordForm.get('email')?.value;

    this.passwordResetService.requestPasswordReset(email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSubmitted = true;

        if (response.email_sent || response.code === 'PASSWORD_RESET_EMAIL_SENT') {
          // Éxito - mostrar estado de éxito en lugar de redirigir
          this.isSuccess = true;
          this.toastService.showSuccess('¡Revisa tu email!', 'Hemos enviado las instrucciones para recuperar tu contraseña');
        } else {
          this.toastService.showError(response.message || 'Ocurrió un error al solicitar el restablecimiento de contraseña');
        }
      },
      error: (error) => {
        this.isLoading = false;

        // Manejar errores específicos del backend
        let errorMessage = 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';

        if (error.error?.code) {
          errorMessage = getErrorMessage(error.error.code);
        } else if (error.status === 429) {
          errorMessage = getErrorMessage(PASSWORD_RESET_ERRORS.TOO_MANY_REQUESTS);
        }

        this.toastService.showError(errorMessage);
      }
    });
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  get emailErrorMessage(): string {
    const emailControl = this.email;

    if (emailControl?.hasError('required') && emailControl?.touched) {
      return 'El email es requerido';
    }

    if (emailControl?.hasError('email') && emailControl?.touched) {
      return 'Por favor, ingresa un email válido';
    }

    return '';
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}