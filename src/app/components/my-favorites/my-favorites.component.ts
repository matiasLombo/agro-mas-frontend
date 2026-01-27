import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FavoritesService, FavoriteWithDetails } from '../../core/services/favorites.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-my-favorites',
  templateUrl: './my-favorites.component.html',
  styleUrls: ['./my-favorites.component.scss']
})
export class MyFavoritesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  favorites: FavoriteWithDetails[] = [];
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;

  constructor(
    private favoritesService: FavoritesService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadFavorites();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.hasError = false;

    this.favoritesService.getMyFavorites(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.favorites = response.favorites || [];
          this.totalCount = response.total_count;
          this.totalPages = response.total_pages;
          this.currentPage = response.page;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading favorites:', error);
          this.hasError = true;
          this.errorMessage = 'Error al cargar favoritos';
          this.isLoading = false;
          this.toastService.showError('Error al cargar favoritos', 'Error');
        }
      });
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/product-detail', productId]);
  }

  removeFavorite(favorite: FavoriteWithDetails): void {
    if (confirm(`¿Eliminar "${favorite.product_title}" de favoritos?`)) {
      this.favoritesService.toggleFavorite(favorite.product_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastService.showSuccess('Producto eliminado de favoritos', 'Éxito');
            // Remove from local array
            this.favorites = this.favorites.filter(f => f.product_id !== favorite.product_id);
            this.totalCount--;

            // If no items left on this page, go to previous page
            if (this.favorites.length === 0 && this.currentPage > 1) {
              this.currentPage--;
              this.loadFavorites();
            }
          },
          error: (error) => {
            console.error('Error removing favorite:', error);
            this.toastService.showError('Error al eliminar favorito', 'Error');
          }
        });
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadFavorites();
    window.scrollTo(0, 0);
  }

  getProductImageUrl(favorite: FavoriteWithDetails): string {
    if (favorite.product_primary_image_url) {
      return favorite.product_primary_image_url;
    }
    return 'assets/images/no-image-placeholder.png';
  }

  formatPrice(favorite: FavoriteWithDetails): string {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: favorite.product_currency || 'ARS',
      minimumFractionDigits: 0
    });

    // Handle transport category - show price per km
    if (favorite.product_category === 'transport') {
      const pricePerKm = favorite.transport_price_per_km ?? 0;
      const startupCost = favorite.transport_startup_cost ?? 0;

      if (pricePerKm > 0) {
        let priceText = `${formatter.format(pricePerKm)} / km`;
        if (startupCost > 0) {
          priceText += ` + ${formatter.format(startupCost)} arranque`;
        }
        return priceText;
      }
    }

    // Handle other categories - show regular price
    if (!favorite.product_price || favorite.product_price === 0) {
      return 'Consultar precio';
    }

    let priceText = formatter.format(favorite.product_price);
    if (favorite.product_unit) {
      priceText += ` / ${favorite.product_unit}`;
    }
    return priceText;
  }

  getLocationText(favorite: FavoriteWithDetails): string {
    const parts = [
      favorite.product_settlement_name,
      favorite.product_department_name,
      favorite.product_province_name
    ].filter(Boolean);

    return parts.join(', ') || 'Ubicación no especificada';
  }

  getCategoryName(category: string): string {
    const categories: { [key: string]: string } = {
      'transport': 'Transporte',
      'livestock': 'Ganado',
      'supplies': 'Suministros'
    };
    return categories[category] || category;
  }

  onImageError(event: any): void {
    // Set a placeholder image when the original image fails to load
    event.target.src = 'assets/images/no-image-placeholder.png';
  }
}
