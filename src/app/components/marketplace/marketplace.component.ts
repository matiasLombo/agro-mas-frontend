import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Product, ProductSearchResponse } from '@core/models/product.model';
import { images } from '@core/constants/images.constants';
import { QuotationDialogComponent } from '../quotation-dialog/quotation-dialog.component';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.component.html',
  styleUrls: ['./marketplace.component.scss']
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  products: Product[] = [];
  isLoading = false;
  hasError = false;
  errorMessage = '';
  totalProducts = 0;

  // Search and filters
  searchQuery = '';
  selectedCategory = '';
  selectedLocation = '';

  // Favorites
  favoritesMap: Map<string, boolean> = new Map();

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private dialog: MatDialog,
    private whatsAppService: WhatsAppService,
    private favoritesService: FavoritesService
  ) { }

  ngOnInit() {
    this.loadFeaturedProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }

  get currentUser() {
    return this.authService.currentUser;
  }

  /**
   * Load featured products for the marketplace homepage
   */
  loadFeaturedProducts() {
    this.isLoading = true;
    this.hasError = false;

    this.productService.getFeaturedProducts()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: ProductSearchResponse) => {
          this.products = response.products;
          this.totalProducts = response.total_count;
          this.hasError = false;
          this.loadFavoritesForProducts();
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.hasError = true;
          this.errorMessage = 'Error al cargar los productos. Por favor, intenta de nuevo.';
          this.toastService.showError('Error al cargar productos', 'Error');
          // Fallback to show some placeholder data
          this.loadPlaceholderProducts();
        }
      });
  }

  /**
   * Load products by category
   */
  loadProductsByCategory(category: string) {
    this.isLoading = true;
    this.selectedCategory = category;

    this.productService.getProductsByCategory(category)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: ProductSearchResponse) => {
          this.products = response.products;
          this.totalProducts = response.total_count;
          this.hasError = false;
          this.loadFavoritesForProducts();
        },
        error: (error) => {
          console.error('Error loading products by category:', error);
          this.toastService.showError('Error al cargar productos por categoría', 'Error');
        }
      });
  }

  /**
   * Search products
   */
  searchProducts() {
    if (!this.searchQuery.trim()) {
      this.loadFeaturedProducts();
      return;
    }

    this.isLoading = true;

    this.productService.searchProducts({
      query: this.searchQuery,
      category: this.selectedCategory || undefined,
      page: 1,
      page_size: 20
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: ProductSearchResponse) => {
          this.products = response.products;
          this.totalProducts = response.total_count;
          this.hasError = false;
          this.loadFavoritesForProducts();
        },
        error: (error) => {
          console.error('Error searching products:', error);
          this.toastService.showError('Error en la búsqueda', 'Error');
        }
      });
  }

  /**
   * Handle product interactions (requires login for non-authenticated users)
   */
  requireLogin(action: string) {
    if (this.isAuthenticated) {
      this.toastService.showInfo(`Funcionalidad "${action}" en desarrollo. ¡Pronto estará disponible!`, 'Información');
    } else {
      this.toastService.showWarning(`Para ${action.toLowerCase()} necesitas iniciar sesión`, 'Advertencia');
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    }
  }


  /**
   * Format price for display
   */
  formatPrice(product: Product): string {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: product.currency || 'ARS',
      minimumFractionDigits: 0
    });

    // Handle transport category - show price per km
    if (product.category === 'transport' && product.transport_details) {
      const pricePerKm = product.transport_details.price_per_km ?? 0;
      const startupCost = product.transport_details.startup_cost ?? 0;

      let priceText = `${formatter.format(pricePerKm)} / km`;
      if (startupCost > 0) {
        priceText += ` + ${formatter.format(startupCost)} arranque`;
      }
      return priceText;
    }

    // Handle other categories - show regular price
    if (product.price === undefined || product.price === null) {
      return formatter.format(0);
    }

    let priceText = formatter.format(product.price);
    if (product.unit) {
      priceText += ` / ${product.unit}`;
    }
    return priceText;
  }




  /**
   * Get category name in Spanish
   */
  getCategoryName(category: string): string {
    const categoryNames: { [key: string]: string } = {
      'transport': 'Transporte',
      'livestock': 'Ganado',
      'supplies': 'Suministros'
    };
    return categoryNames[category] || category;
  }

  /**
   * Get primary image URL for a product
   */
  getPrimaryImage(product: Product): string {
    // First try to get the primary image
    const primaryImage = product.images?.find(img => img.is_primary);
    if (primaryImage) {
      return primaryImage.image_url;
    }

    // If no primary image, get the first available image
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

    // Return placeholder image based on category
    return this.getPlaceholderImage(product.category);
  }

  /**
   * Get placeholder image based on category
   */
  getPlaceholderImage(category: string): string {
    const placeholders: { [key: string]: string } = {
      'transport': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f8fafc"/><g fill="%234CAF50"><text x="50%" y="50%" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" dy=".3em">🚚</text></g></svg>',
      'livestock': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f8fafc"/><g fill="%234CAF50"><text x="50%" y="50%" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" dy=".3em">🐄</text></g></svg>',
      'supplies': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f8fafc"/><g fill="%234CAF50"><text x="50%" y="50%" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" dy=".3em">🌿</text></g></svg>'
    };

    return placeholders[category] || placeholders['supplies'];
  }

  /**
   * Handle image load errors
   */
  onImageError(event: any): void {
    const img = event.target;
    const productCard = img.closest('.product-card');
    if (productCard) {
      const categoryElement = productCard.querySelector('.product-category');
      const category = categoryElement?.textContent?.toLowerCase();

      // Map Spanish category names back to English for placeholder
      const categoryMap: { [key: string]: string } = {
        'transporte': 'transport',
        'ganado': 'livestock',
        'suministros': 'supplies'
      };

      const categoryKey = categoryMap[category || ''] || 'supplies';
      img.src = this.getPlaceholderImage(categoryKey);
    }
  }

  /**
   * Navigate to product details
   */
  viewProduct(productId: string): void {
    this.router.navigate(['/product-detail', productId]);
  }

  /**
   * Open quotation dialog for a product
   */
  openQuotationDialog(product: Product): void {
    // Check if user is authenticated
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.toastService.showWarning('Debes iniciar sesión para contactar al vendedor', 'Autenticación requerida');
      setTimeout(() => {
        this.router.navigate(['/auth']);
      }, 1500);
      return;
    }

    // Open the quotation dialog
    const dialogRef = this.dialog.open(QuotationDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { product: product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle the quotation result
        console.log('Quotation submitted:', result);

        const buyerName = `${result.firstName} ${result.lastName}`.trim();

        // Generate product URL
        const productUrl = `${window.location.origin}/product-detail/${product.id}`;

        // Prepare message data for WhatsApp
        const messageData = {
          product_title: product.title,
          product_price: product.price,
          buyer_name: buyerName,
          offer_price: result.offerPrice,
          message: result.message || undefined,
          includes_iva: result.includesIVA,
          is_final_price: result.isFinalPrice,
          product_url: productUrl
        };

        // Pre-open window synchronously to avoid popup blockers on mobile
        const whatsappWindow = this.whatsAppService.prepareWindow();

        // Generate WhatsApp link and open
        this.whatsAppService.contactSeller(messageData).subscribe({
          next: (response) => {
            console.log('WhatsApp link generated:', response);
            // Navigate the pre-opened window (or fallback) to WhatsApp URL
            this.whatsAppService.openWhatsApp(response.whatsapp_url, whatsappWindow);
            this.toastService.showSuccess('Abriendo WhatsApp...', 'Contacto iniciado');
          },
          error: (error) => {
            console.error('Error generating WhatsApp link:', error);
            this.toastService.showError('Error al generar el enlace de WhatsApp', 'Error');
            if (whatsappWindow) {
              whatsappWindow.close();
            }
          }
        });
      }
    });
  }

  /**
   * Load placeholder products as fallback
   */
  private loadPlaceholderProducts() {
    this.products = [
      {
        id: 'placeholder-1',
        user_id: 'user-1',
        title: 'Semillas de Maíz Premium',
        description: 'Semillas híbridas de alta calidad, resistentes a sequía y plagas.',
        category: 'semillas',
        price: 25000,
        price_type: 'fixed',
        currency: 'ARS',
        unit: 'kg',
        is_active: true,
        is_featured: true,
        pickup_available: true,
        delivery_available: false,
        seller_name: 'Vendedor Demo',
        views_count: 24,
        favorites_count: 12,
        inquiries_count: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: ['semillas', 'maíz', 'premium']
      }
    ];
    this.totalProducts = 1;
  }

  get images() {
    return images.banner
  }

  hasImage(product: Product): boolean {
    return !!(product.images && product.images.length > 0 && product.images.some(img => img.image_url));
  }

  hasVideo(product: Product): boolean {
    return !!(product.videos && product.videos.length > 0 &&
      product.videos.some(vid => vid.video_url && vid.video_url !== 'processing' && vid.video_url !== 'upload_failed'));
  }

  /**
   * Load favorited products for authenticated users
   */
  loadFavoritesForProducts(): void {
    if (!this.isAuthenticated || this.products.length === 0) {
      return;
    }

    const productIds = this.products.map(p => p.id);

    this.favoritesService.checkFavorites(productIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          Object.entries(response.favorites).forEach(([productId, isFavorited]) => {
            this.favoritesMap.set(productId, isFavorited);
          });
        },
        error: (error) => {
          console.error('Error loading favorites:', error);
          // Don't show error to user - non-critical feature
        }
      });
  }

  /**
   * Toggle favorite status for a product
   */
  toggleFavorite(event: Event, productId: string): void {
    event.stopPropagation(); // Prevent navigation to product detail

    if (!this.isAuthenticated) {
      this.toastService.showInfo('Debes iniciar sesión para guardar favoritos', 'Información');
      this.router.navigate(['/login']);
      return;
    }

    const isFavorited = this.favoritesMap.get(productId) || false;

    // Optimistic UI update
    this.favoritesMap.set(productId, !isFavorited);

    // Update favorites count on product
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product.favorites_count += isFavorited ? -1 : 1;
    }

    this.favoritesService.toggleFavorite(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.favoritesMap.set(productId, response.is_favorited);
          const message = response.is_favorited
            ? 'Producto agregado a favoritos'
            : 'Producto eliminado de favoritos';
          this.toastService.showSuccess(message, 'Éxito');
        },
        error: (error) => {
          console.error('Error toggling favorite:', error);
          // Rollback optimistic update
          this.favoritesMap.set(productId, isFavorited);
          if (product) {
            product.favorites_count += isFavorited ? 1 : -1;
          }
          this.toastService.showError('Error al actualizar favoritos', 'Error');
        }
      });
  }

  /**
   * Check if a product is favorited
   */
  isFavorited(productId: string): boolean {
    return this.favoritesMap.get(productId) || false;
  }
}