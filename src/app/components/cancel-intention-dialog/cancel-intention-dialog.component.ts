import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface CancelIntentionDialogData {
    productTitle: string;
}

export interface CancelIntentionDialogResult {
    confirmed: boolean;
    reason?: string;
}

@Component({
    selector: 'app-cancel-intention-dialog',
    templateUrl: './cancel-intention-dialog.component.html',
    styleUrls: ['./cancel-intention-dialog.component.scss']
})
export class CancelIntentionDialogComponent {
    cancelForm: FormGroup;

    cancellationReasons = [
        'Encontré un mejor precio',
        'Ya no necesito el producto',
        'Encontré el producto en otro lugar',
        'El vendedor no respondió',
        'Cambié de opinión',
        'Otro motivo'
    ];

    constructor(
        public dialogRef: MatDialogRef<CancelIntentionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CancelIntentionDialogData,
        private fb: FormBuilder
    ) {
        this.cancelForm = this.fb.group({
            reason: ['', Validators.required],
            customReason: ['']
        });

        // Watch for "Otro motivo" selection to show custom reason field
        this.cancelForm.get('reason')?.valueChanges.subscribe(value => {
            const customReasonControl = this.cancelForm.get('customReason');
            if (value === 'Otro motivo') {
                customReasonControl?.setValidators([Validators.required, Validators.minLength(10)]);
            } else {
                customReasonControl?.clearValidators();
            }
            customReasonControl?.updateValueAndValidity();
        });
    }

    onCancel(): void {
        this.dialogRef.close({ confirmed: false });
    }

    onConfirm(): void {
        if (this.cancelForm.valid) {
            const reason = this.cancelForm.value.reason === 'Otro motivo'
                ? this.cancelForm.value.customReason
                : this.cancelForm.value.reason;

            this.dialogRef.close({
                confirmed: true,
                reason
            });
        }
    }

    get showCustomReason(): boolean {
        return this.cancelForm.get('reason')?.value === 'Otro motivo';
    }
}
