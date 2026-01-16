import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { Product, ProductImage, ProductVideo } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { CommissionService } from '../../core/services/commission.service';
import { CommissionBreakdown, CommissionConfig } from '../../core/models/commission.model';
import { environment } from '../../../environments/environment';

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
  @ViewChild('mainVideo') mainVideo?: ElementRef<HTMLVideoElement>;

  product: Product | null = null;
  images: ProductImage[] = [];
  videos: ProductVideo[] = [];
  mediaItems: MediaItem[] = [];
  currentMediaIndex = 0;
  currentImageIndex = 0;
  isLoading = true;
  isOwner = false;

  // Hide quotation form for product owners
  get canQuote(): boolean {
    return !this.isOwner;
  }

  // Quotation form
  quotationForm: FormGroup;
  originalPrice: number = 0;

  // Commission variables
  commissionBreakdown: CommissionBreakdown | null = null;
  commissionConfig: CommissionConfig | null = null;
  showCommissionDetails: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private authService: AuthService,
    private fb: FormBuilder,
    private toastService: ToastService,
    private whatsAppService: WhatsAppService,
    public commissionService: CommissionService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize quotation form - simplified without personal data
    this.quotationForm = this.fb.group({
      message: ['', Validators.maxLength(500)],
      offerPrice: [0, [Validators.required, Validators.min(0)]],
      includesIVA: [false],
      isFinalPrice: [false]
    });

    // Subscribe to offerPrice changes to recalculate commissions
    this.quotationForm.get('offerPrice')?.valueChanges.subscribe(price => {
      if (this.product && price > 0) {
        this.updateCommissions(price);
      }
    });
  }

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
    }
  }

  /**
   * Load commission configuration from backend (ONE TIME per product)
   */
  loadCommissionConfig(category: string): void {
    this.commissionService.getCommissionConfig(category).subscribe({
      next: (config) => {
        // Cache the configuration
        this.commissionConfig = config;

        // Now calculate commissions with the loaded config
        if (this.originalPrice > 0) {
          this.updateCommissions(this.originalPrice);
        }
      },
      error: (error) => {
        console.error('Error loading commission config:', error);
        // Fallback to local calculation if backend fails
        this.commissionConfig = this.getLocalCommissionConfig(category);
        if (this.originalPrice > 0) {
          this.updateCommissions(this.originalPrice);
        }
      }
    });
  }

  /**
   * Fallback: Get commission config locally if backend fails
   */
  private getLocalCommissionConfig(category: string): CommissionConfig {
    switch (category) {
      case 'livestock':
        return {
          buyer_commission_percent: 1.5,
          seller_commission_percent: 1.5,
          total_commission_percent: 3.0,
          description: '1.5% al comprador + 1.5% al vendedor'
        };
      case 'transport':
        return {
          buyer_commission_percent: 0.0,
          seller_commission_percent: 3.0,
          total_commission_percent: 3.0,
          description: '3% al transportista'
        };
      case 'supplies':
        return {
          buyer_commission_percent: 0.0,
          seller_commission_percent: 3.0,
          total_commission_percent: 3.0,
          description: '3% al vendedor'
        };
      default:
        return {
          buyer_commission_percent: 0.0,
          seller_commission_percent: 0.0,
          total_commission_percent: 0.0,
          description: 'Sin comisión'
        };
    }
  }

  /**
   * Update commission breakdown based on current offer price
   * Uses cached commission config from backend
   */
  updateCommissions(price: number): void {
    if (this.commissionConfig && price > 0) {
      // Calculate using cached config from backend
      const buyerCommission = price * (this.commissionConfig.buyer_commission_percent / 100);
      const sellerCommission = price * (this.commissionConfig.seller_commission_percent / 100);
      const totalCommission = buyerCommission + sellerCommission;

      this.commissionBreakdown = {
        base_price: price,
        buyer_commission: buyerCommission,
        seller_commission: sellerCommission,
        total_commission: totalCommission,
        buyer_total: price + buyerCommission,
        seller_net: price - sellerCommission,
        config: this.commissionConfig
      };
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

          // Set original price and update form
          this.originalPrice = product.price;
          this.quotationForm.patchValue({
            offerPrice: this.originalPrice
          });

          // Load commission configuration from backend (ONE TIME)
          this.loadCommissionConfig(product.category);

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
      this.reloadVideoIfNeeded();
    }
  }

  prevImage(): void {
    if (this.mediaItems.length > 1) {
      this.currentMediaIndex = this.currentMediaIndex === 0 ? this.mediaItems.length - 1 : this.currentMediaIndex - 1;
      this.reloadVideoIfNeeded();
    }
  }

  private reloadVideoIfNeeded(): void {
    // Force change detection and video reload when changing to a video
    if (this.getCurrentMediaItem()?.type === 'video') {
      setTimeout(() => {
        const videoElement = document.querySelector('.main-video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.load();
        }
      }, 0);
    }
  }

  selectMedia(index: number): void {
    this.currentMediaIndex = index;
    this.reloadVideoIfNeeded();
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

  // Quotation form methods
  onSubmitQuotation(): void {
    if (!this.product) return;

    // Check if user is authenticated
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.toastService.showWarning('Debes iniciar sesión para enviar una cotización', 'Autenticación requerida');
      setTimeout(() => {
        this.router.navigate(['/auth']);
      }, 1500);
      return;
    }

    if (this.quotationForm.valid) {
      const formValues = this.quotationForm.value;
      const buyerName = `${currentUser.first_name} ${currentUser.last_name}`.trim();

      // Generate product URL
      const productUrl = `${window.location.origin}/product-detail/${this.product.id}`;

      // Prepare message data for WhatsApp with purchase intention fields
      const messageData = {
        product_title: this.product.title,
        product_price: this.originalPrice,
        product_category: this.product.category,
        buyer_name: buyerName,
        offer_price: formValues.offerPrice,
        message: formValues.message || undefined,
        includes_iva: formValues.includesIVA,
        is_final_price: formValues.isFinalPrice,
        product_url: productUrl,
        // Campos adicionales para crear purchase_intention
        product_id: this.product.id,
        seller_id: this.product.user_id,
        inquiry_type: 'price' // Tipo de consulta: price, availability, technical, logistics, general
      };

      // Generate WhatsApp link and open
      this.whatsAppService.contactSeller(messageData).subscribe({
        next: (response) => {
          console.log('WhatsApp link generated:', response);

          // Log purchase intention creation
          if (response.intention_created && response.intention_id) {
            console.log('✅ Purchase intention created:', response.intention_id);
            this.toastService.showSuccess(
              'Tu consulta ha sido registrada y se abrirá WhatsApp',
              'Intención de compra creada'
            );
          } else {
            this.toastService.showSuccess('Abriendo WhatsApp...', 'Contacto iniciado');
          }

          // Open WhatsApp in a new tab
          this.whatsAppService.openWhatsApp(response.whatsapp_url);
        },
        error: (error) => {
          console.error('Error generating WhatsApp link:', error);
          this.toastService.showError('Error al generar el enlace de WhatsApp', 'Error');
        }
      });
    } else {
      this.toastService.showWarning('Por favor ingresa una oferta válida', 'Formulario incompleto');
    }
  } get priceChange(): number {
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

  toggleFinalPrice(): void {
    const currentValue = this.quotationForm.get('isFinalPrice')?.value;
    this.quotationForm.patchValue({ isFinalPrice: !currentValue });
  }

  get isFinalPrice(): boolean {
    return this.quotationForm.get('isFinalPrice')?.value || false;
  }

  formatPriceValue(price: number): string {
    if (!this.product) return '';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: this.product.currency || 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  }

  contactSeller(): void {
    // This method is now replaced by the inline quotation form
    // Scroll to the quotation form
    const quotationSection = document.querySelector('.quotation-panel');
    if (quotationSection) {
      quotationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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