import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ToastData {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
}

@Component({
    selector: 'app-custom-toast',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule],
    template: `
    <div class="custom-toast" [ngClass]="'toast-' + data.type">
      <div class="toast-content">
        <div class="toast-icon">
          <mat-icon>{{ getIcon() }}</mat-icon>
        </div>
        <div class="toast-message">
          <div class="toast-title" *ngIf="data.title">{{ data.title }}</div>
          <div class="toast-text">{{ data.message }}</div>
        </div>
      </div>
      <button mat-icon-button class="toast-close" (click)="dismiss()">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
    styles: [`
    .custom-toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-radius: 12px;
      min-width: 380px;
      max-width: 500px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      position: relative;
      overflow: hidden;
    }

    .toast-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      flex: 1;
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .toast-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: white;
    }

    .toast-message {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
      color: rgba(0, 0, 0, 0.87);
    }

    .toast-text {
      font-size: 14px;
      line-height: 1.4;
      color: rgba(0, 0, 0, 0.7);
    }

    .toast-close {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      color: rgba(0, 0, 0, 0.5);
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }
    }

    // Success Toast (Verde)
    .toast-success {
      background-color: #f0f9f0;
      border-left: 4px solid #4caf50;
      
      .toast-icon {
        background-color: #4caf50;
      }
    }

    // Error Toast (Rojo)
    .toast-error {
      background-color: #fef7f7;
      border-left: 4px solid #f44336;
      
      .toast-icon {
        background-color: #f44336;
      }
    }

    // Warning Toast (Amarillo/Naranja)
    .toast-warning {
      background-color: #fff8e1;
      border-left: 4px solid #ff9800;
      
      .toast-icon {
        background-color: #ff9800;
      }
    }

    // Info Toast (Azul)
    .toast-info {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
      
      .toast-icon {
        background-color: #2196f3;
      }
    }
  `]
})
export class CustomToastComponent {
    constructor(
        @Inject(MAT_SNACK_BAR_DATA) public data: ToastData,
        private snackBarRef: MatSnackBarRef<CustomToastComponent>
    ) { }

    getIcon(): string {
        switch (this.data.type) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'cancel';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'info';
        }
    }

    dismiss(): void {
        this.snackBarRef.dismiss();
    }
}