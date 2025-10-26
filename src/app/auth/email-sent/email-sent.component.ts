import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-email-sent',
  templateUrl: './email-sent.component.html',
  styleUrls: ['./email-sent.component.scss']
})
export class EmailSentComponent implements OnInit {
  email: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Obtener email del sessionStorage
    this.email = sessionStorage.getItem('resetEmail');

    // Limpiar el sessionStorage después de usarlo
    if (this.email) {
      sessionStorage.removeItem('resetEmail');
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  // Método para formatear el email (ocultar parte del mismo por privacidad)
  get maskedEmail(): string {
    if (!this.email) return '';

    const [username, domain] = this.email.split('@');
    if (!username || !domain) return this.email;

    // Mostrar solo las primeras 2 y últimas 2 letras del username
    const visibleStart = username.substring(0, 2);
    const visibleEnd = username.substring(username.length - 2);
    const maskedPart = '*'.repeat(Math.max(1, username.length - 4));

    return `${visibleStart}${maskedPart}${visibleEnd}@${domain}`;
  }

  // Verificar si el email tiene un formato válido para mostrarlo
  get isValidEmail(): boolean {
    if (!this.email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }
}