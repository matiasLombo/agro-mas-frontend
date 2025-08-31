import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Product } from '../../core/models/product.model';

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
    @Inject(MAT_DIALOG_DATA) public data: QuotationData
  ) {
    this.originalPrice = data.product.price;
    
    this.quotationForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-\(\)]{8,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.maxLength(500)],
      offerPrice: [this.originalPrice, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {}

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
}