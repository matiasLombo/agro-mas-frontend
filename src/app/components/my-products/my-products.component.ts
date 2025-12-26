import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../core/services/toast.service';

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
    private toastService: ToastService
  ) { }

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

    this.productService.getProductsByUser()
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
          this.toastService.showError('Error al cargar productos', 'Error');
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
            this.toastService.showSuccess(message, 'Éxito');
          },
          error: (error) => {
            console.error('Error updating product status:', error);
            this.toastService.showError('Error al actualizar el producto', 'Error');
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
            this.toastService.showSuccess('Producto eliminado exitosamente', 'Éxito');
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.toastService.showError('Error al eliminar el producto', 'Error');
          }
        });
    }
  }

  createNewProduct(): void {
    this.router.navigate(['/product']);
  }

  formatPrice(product: Product): string {
    // Handle transport category - show price per km
    if (product.category === 'transport' && product.transport_details) {
      const formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: product.currency || 'ARS',
        minimumFractionDigits: 0
      });

      const pricePerKm = product.transport_details.price_per_km;
      const startupCost = product.transport_details.startup_cost;

      if (pricePerKm !== undefined && pricePerKm !== null) {
        let priceText = `${formatter.format(pricePerKm)} / km`;
        if (startupCost !== undefined && startupCost !== null && startupCost > 0) {
          priceText += ` + ${formatter.format(startupCost)} arranque`;
        }
        return priceText;
      }
      return 'Precio a consultar';
    }

    // Handle other categories - show regular price
    if (product.price === undefined || product.price === null) {
      return 'Precio a consultar';
    }

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
    // First, try to get primary image
    const primaryImage = product.images?.find(img => img.is_primary);
    if (primaryImage) {
      return primaryImage.image_url;
    }

    // Then, try to get first image
    const firstImage = product.images?.find(img => img.image_url);
    if (firstImage) {
      return firstImage.image_url;
    }

    // If no images, try to get primary video thumbnail
    const primaryVideo = product.videos?.find(vid => vid.is_primary && vid.video_url && vid.video_url !== 'processing' && vid.video_url !== 'upload_failed');
    if (primaryVideo) {
      return primaryVideo.video_url;
    }

    // If no primary video, get first available video
    const firstVideo = product.videos?.find(vid => vid.video_url && vid.video_url !== 'processing' && vid.video_url !== 'upload_failed');
    if (firstVideo) {
      return firstVideo.video_url;
    }

    return this.getPlaceholderImage(product.category);
  }

  getPlaceholderImage(category: string): string {
    const placeholders: { [key: string]: string } = {
      'transport': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" dy=".3em">🚚</text></svg>',
      'livestock': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" dy=".3em">🐄</text></svg>',
      'supplies': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial,sans-serif" font-size="48" dy=".3em">🌿</text></svg>'
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

  hasImage(product: Product): boolean {
    return !!(product.images && product.images.length > 0 && product.images.some(img => img.image_url));
  }

  hasVideo(product: Product): boolean {
    return !!(product.videos && product.videos.length > 0 &&
      product.videos.some(vid => vid.video_url && vid.video_url !== 'processing' && vid.video_url !== 'upload_failed'));
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