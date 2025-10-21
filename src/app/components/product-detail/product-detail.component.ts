import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { Product, ProductImage, ProductVideo } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { QuotationDialogComponent } from '../quotation-dialog/quotation-dialog.component';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  alt?: string;
  displayOrder: number;
}

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  images: ProductImage[] = [];
  videos: ProductVideo[] = [];
  mediaItems: MediaItem[] = [];
  currentMediaIndex = 0;
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
          this.images = product.images || [];
          this.videos = product.videos || [];

          this.buildMediaItems();
          this.checkOwnership();
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading product:', error);
        this.isLoading = false;
      }
    });
  }

  buildMediaItems(): void {
    this.mediaItems = [];

    // Add images
    this.images.forEach(img => {
      this.mediaItems.push({
        url: img.image_url,
        type: 'image',
        alt: img.alt_text || '',
        displayOrder: img.display_order
      });
    });

    // Add videos
    this.videos.forEach(vid => {
      this.mediaItems.push({
        url: vid.video_url,
        type: 'video',
        alt: vid.alt_text || '',
        displayOrder: vid.display_order
      });
    });

    // Sort by display order
    this.mediaItems.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  checkOwnership(): void {
    const currentUser = this.authService.currentUser;
    this.isOwner = !!(currentUser && this.product && currentUser.id === this.product.user_id);
  }

  nextImage(): void {
    if (this.mediaItems.length > 1) {
      this.currentMediaIndex = (this.currentMediaIndex + 1) % this.mediaItems.length;
    }
  }

  prevImage(): void {
    if (this.mediaItems.length > 1) {
      this.currentMediaIndex = this.currentMediaIndex === 0 ? this.mediaItems.length - 1 : this.currentMediaIndex - 1;
    }
  }

  getCurrentImage(): string {
    if (this.mediaItems.length > 0 && this.mediaItems[this.currentMediaIndex]?.type === 'image') {
      return this.mediaItems[this.currentMediaIndex].url;
    }
    return this.getPlaceholderImage();
  }

  getCurrentMediaItem(): MediaItem | null {
    return this.mediaItems.length > 0 ? this.mediaItems[this.currentMediaIndex] : null;
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

  contactSeller(): void {
    if (!this.product) return;

    // Check if user is authenticated
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      // Redirect to login if not authenticated
      this.router.navigate(['/login']);
      return;
    }

    // If authenticated, open contact dialog
    const dialogRef = this.dialog.open(QuotationDialogComponent, {
      width: '500px',
      data: { product: this.product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Aquí enviarías la solicitud de contacto al backend
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
      'transport': '\uD83D\uDE9A Transporte',
      'livestock': '\uD83D\uDC04 Ganado',
      'supplies': '\uD83C\uDF3E Insumos'
    };
    return categoryNames[category] || category;
  }

  getFormattedLocation(product: Product): string {
    const locationParts: string[] = [];

    // Use name properties first, fallback to ID properties
    const settlement = product.settlement_name || product.city;
    const department = product.department_name;
    const province = product.province_name;

    if (settlement) {
      locationParts.push(settlement);
    }
    if (department) {
      locationParts.push(department);
    }
    if (province) {
      locationParts.push(province);
    }

    return locationParts.length > 0 ? locationParts.join(', ') : 'Ubicación no especificada';
  }

  // Category-specific detail methods
  hasTransportDetails(): boolean {
    return !!(this.product?.transport_details);
  }

  hasLivestockDetails(): boolean {
    return !!(this.product?.livestock_details);
  }

  hasSuppliesDetails(): boolean {
    return !!(this.product?.supplies_details);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'No especificado';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'No especificado';
    }
  }

  getVehicleTypeName(type: string): string {
    const types: { [key: string]: string } = {
      'camion': 'Camión',
      'camioneta': 'Camioneta',
      'trailer': 'Trailer',
      'semi_trailer': 'Semi Trailer',
      'furgon': 'Furgón'
    };
    return types[type] || type;
  }

  getAnimalTypeName(type: string): string {
    const types: { [key: string]: string } = {
      'bovino': 'Bovino',
      'ovino': 'Ovino',
      'porcino': 'Porcino',
      'equino': 'Equino',
      'caprino': 'Caprino',
      'aves': 'Aves'
    };
    return types[type] || type;
  }

  getSupplyTypeName(type: string): string {
    const types: { [key: string]: string } = {
      'fertilizante': 'Fertilizante',
      'pesticida': 'Pesticida',
      'herbicida': 'Herbicida',
      'semilla': 'Semilla',
      'alimento': 'Alimento',
      'medicamento': 'Medicamento Veterinario',
      'herramienta': 'Herramienta',
      'maquinaria': 'Maquinaria'
    };
    return types[type] || type;
  }
}