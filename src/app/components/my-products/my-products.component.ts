import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-my-products',
  templateUrl: './my-products.component.html',
  styleUrls: ['./my-products.component.scss']
})
export class MyProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  products: Product[] = [];
  isLoading = false;
  hasError = false;
  errorMessage = '';

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMyProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyProducts(): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    this.productService.getProductsByUser(currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.products || [];
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user products:', error);
          this.hasError = true;
          this.errorMessage = 'Error al cargar tus productos';
          this.isLoading = false;
          this.snackBar.open('Error al cargar productos', 'Cerrar', { duration: 3000 });
        }
      });
  }

  editProduct(productId: string): void {
    this.router.navigate(['/product', productId], { queryParams: { edit: true } });
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/product-detail', productId]);
  }

  toggleProductStatus(product: Product): void {
    const newStatus = !product.is_active;
    const action = newStatus ? 'activar' : 'desactivar';
    
    if (confirm(`¿Estás seguro de que quieres ${action} este producto?`)) {
      this.productService.updateProduct(product.id, { is_active: newStatus })
        .subscribe({
          next: () => {
            product.is_active = newStatus;
            const message = newStatus ? 'Producto activado' : 'Producto desactivado';
            this.snackBar.open(message, 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error updating product status:', error);
            this.snackBar.open('Error al actualizar el producto', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  deleteProduct(product: Product): void {
    const confirmMessage = `¿Estás seguro de que quieres eliminar "${product.title}"? Esta acción no se puede deshacer.`;
    
    if (confirm(confirmMessage)) {
      this.productService.deleteProduct(product.id)
        .subscribe({
          next: () => {
            this.products = this.products.filter(p => p.id !== product.id);
            this.snackBar.open('Producto eliminado exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  createNewProduct(): void {
    this.router.navigate(['/product']);
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

  getPrimaryImage(product: Product): string {
    const primaryImage = product.images?.find(img => img.is_primary);
    if (primaryImage) {
      return primaryImage.image_url;
    }

    const firstImage = product.images?.find(img => img.image_url);
    if (firstImage) {
      return firstImage.image_url;
    }

    return this.getPlaceholderImage(product.category);
  }

  getPlaceholderImage(category: string): string {
    const placeholders: { [key: string]: string } = {
      'transport': '/assets/images/placeholder-transport.svg',
      'livestock': '/assets/images/placeholder-livestock.svg',
      'supplies': '/assets/images/placeholder-supplies.svg'
    };
    return placeholders[category] || placeholders['supplies'];
  }

  getCategoryName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'transport': 'Transporte',
      'livestock': 'Ganado', 
      'supplies': 'Suministros'
    };
    return categoryNames[category] || category;
  }

  getStatusText(product: Product): string {
    return product.is_active ? 'Activo' : 'Inactivo';
  }

  getStatusColor(product: Product): string {
    return product.is_active ? 'primary' : 'warn';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Getters for template calculations
  get activeProductsCount(): number {
    return this.products.filter(p => p.is_active).length;
  }

  get totalViews(): number {
    return this.products.reduce((sum, p) => sum + (p.views_count || 0), 0);
  }

  get totalFavorites(): number {
    return this.products.reduce((sum, p) => sum + (p.favorites_count || 0), 0);
  }
}