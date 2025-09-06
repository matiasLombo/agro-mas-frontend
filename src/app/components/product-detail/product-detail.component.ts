import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Product, ProductImage } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { QuotationDialogComponent } from '../quotation-dialog/quotation-dialog.component';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  images: ProductImage[] = [];
  currentImageIndex = 0;
  isLoading = true;
  isOwner = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
    }
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.productService.getProduct(id).subscribe({
      next: (product) => {
        if (product) {
          this.product = product;
          this.checkOwnership();
          this.loadProductImages(id);
        }
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.isLoading = false;
      }
    });
  }

  loadProductImages(productId: string): void {
    this.productService.getProductImages(productId).subscribe({
      next: (images) => {
        this.images = images.sort((a, b) => a.display_order - b.display_order);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading images:', error);
        this.isLoading = false;
      }
    });
  }

  checkOwnership(): void {
    const currentUser = this.authService.currentUser;
    this.isOwner = !!(currentUser && this.product && currentUser.id === this.product.user_id);
  }

  nextImage(): void {
    if (this.images.length > 1) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }
  }

  prevImage(): void {
    if (this.images.length > 1) {
      this.currentImageIndex = this.currentImageIndex === 0 ? this.images.length - 1 : this.currentImageIndex - 1;
    }
  }

  getCurrentImage(): string {
    if (this.images.length > 0) {
      return this.images[this.currentImageIndex]?.image_url || this.getPlaceholderImage();
    }
    return this.getPlaceholderImage();
  }

  getPlaceholderImage(): string {
    const category = this.product?.category || 'supplies';
    const placeholders: { [key: string]: string } = {
      'transport': '/assets/images/placeholder-transport.svg',
      'livestock': '/assets/images/placeholder-livestock.svg',
      'supplies': '/assets/images/placeholder-supplies.svg'
    };
    return placeholders[category] || placeholders['supplies'];
  }

  formatPrice(product: Product): string {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: product.currency || 'ARS',
      minimumFractionDigits: 0
    });

    let priceText = formatter.format(product.price);
    if (product.unit) {
      priceText += ` / ${product.unit}`;
    }
    return priceText;
  }

  openQuotationDialog(): void {
    if (!this.product) return;
    
    const dialogRef = this.dialog.open(QuotationDialogComponent, {
      width: '500px',
      data: { product: this.product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Quotation submitted:', result);
        // Aquí enviarías la cotización al backend
      }
    });
  }

  editProduct(): void {
    if (this.product) {
      this.router.navigate(['/product', this.product.id], { queryParams: { edit: true } });
    }
  }

  goBack(): void {
    this.router.navigate(['/marketplace']);
  }

  getCategoryName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'transport': 'Transporte',
      'livestock': 'Ganado',
      'supplies': 'Suministros'
    };
    return categoryNames[category] || category;
  }
}