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
    styleUrls: ['./custom-toast.component.scss']
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