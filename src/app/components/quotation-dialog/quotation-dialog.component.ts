import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Product } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';

export interface QuotationData {
  product: Product;
}

export interface QuotationResult {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
  offerPrice: number;
  includesIVA: boolean;
  productId: string;
}

@Component({
  selector: 'app-quotation-dialog',
  templateUrl: './quotation-dialog.component.html',
  styleUrls: ['./quotation-dialog.component.scss']
})
export class QuotationDialogComponent implements OnInit {
  quotationForm: FormGroup;
  originalPrice: number;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<QuotationDialogComponent>,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: QuotationData
  ) {
    this.originalPrice = data.product.price;

    // Get current user data
    const currentUser = this.authService.currentUser;

    this.quotationForm = this.fb.group({
      firstName: [currentUser?.first_name || '', [Validators.required, Validators.minLength(2)]],
      lastName: [currentUser?.last_name || '', [Validators.required, Validators.minLength(2)]],
      phone: [currentUser?.phone || '', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]{8,15}$/)]],
      email: [currentUser?.email || '', [Validators.required, Validators.email]],
      message: ['', Validators.maxLength(500)],
      offerPrice: [this.originalPrice, [Validators.required, Validators.min(0)]],
      includesIVA: [false]
    });
  } ngOnInit(): void { }

  onSubmit(): void {
    if (this.quotationForm.valid) {
      const result: QuotationResult = {
        ...this.quotationForm.value,
        productId: this.data.product.id
      };
      this.dialogRef.close(result);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: this.data.product.currency || 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  }

  get priceChange(): number {
    const currentPrice = this.quotationForm.get('offerPrice')?.value || 0;
    return currentPrice - this.originalPrice;
  }

  get priceChangePercentage(): number {
    const change = this.priceChange;
    return this.originalPrice > 0 ? (change / this.originalPrice) * 100 : 0;
  }

  resetPrice(): void {
    this.quotationForm.patchValue({ offerPrice: this.originalPrice });
  }

  increasePrice(amount: number = 5000): void {
    const currentPrice = this.quotationForm.get('offerPrice')?.value || 0;
    this.quotationForm.patchValue({ offerPrice: currentPrice + amount });
  }

  decreasePrice(amount: number = 5000): void {
    const currentPrice = this.quotationForm.get('offerPrice')?.value || 0;
    const newPrice = Math.max(0, currentPrice - amount); // No permitir precios negativos
    this.quotationForm.patchValue({ offerPrice: newPrice });
  }

  toggleIVA(): void {
    const currentValue = this.quotationForm.get('includesIVA')?.value;
    this.quotationForm.patchValue({ includesIVA: !currentValue });
  }

  get includesIVA(): boolean {
    return this.quotationForm.get('includesIVA')?.value || false;
  }
}