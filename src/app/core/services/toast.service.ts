import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomToastComponent } from '../../shared/components/custom-toast/custom-toast.component';

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    constructor(private snackBar: MatSnackBar) { }

    /**
     * Muestra un toast de éxito
     */
    showSuccess(message: string, title?: string, duration: number = 3000): void {
        this.snackBar.openFromComponent(CustomToastComponent, {
            data: {
                message,
                title: title || 'Éxito!',
                type: 'success'
            },
            duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['custom-toast-container']
        });
    }

    /**
     * Muestra un toast de error
     */
    showError(message: string, title?: string, duration: number = 5000): void {
        this.snackBar.openFromComponent(CustomToastComponent, {
            data: {
                message,
                title: title || 'Error',
                type: 'error'
            },
            duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['custom-toast-container']
        });
    }

    /**
     * Muestra un toast de información
     */
    showInfo(message: string, title?: string, duration: number = 3000): void {
        this.snackBar.openFromComponent(CustomToastComponent, {
            data: {
                message,
                title: title || 'Información',
                type: 'info'
            },
            duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['custom-toast-container']
        });
    }

    /**
     * Muestra un toast de advertencia
     */
    showWarning(message: string, title?: string, duration: number = 4000): void {
        this.snackBar.openFromComponent(CustomToastComponent, {
            data: {
                message,
                title: title || 'Advertencia',
                type: 'warning'
            },
            duration,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['custom-toast-container']
        });
    }
}