import { Component, OnInit, Input, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { formatDate } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { SellerService } from '../../services/seller.service';
import { ToastService } from '../../core/services/toast.service';
import { Product, ProductImage, ProductVideo, TransportDetails, LivestockDetails, SuppliesDetails } from '../../core/models/product.model';
import { Province, Department, Settlement } from '../../core/models/location.model';
import { MatChipInputEvent } from '@angular/material/chips';
import { SellerSetupModalComponent } from '../seller-setup-modal/seller-setup-modal.component';
import { Observable, forkJoin } from 'rxjs';

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'video';
  compressed?: boolean;
  originalSize: number;
  compressedSize?: number;
}

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit {
  @Input() productId: string | null = null;

  productForm!: FormGroup;
  isEditMode = false;
  categories = ['Ganado', 'Insumo', 'Transporte'];

  uploadedImages: ProductImage[] = [];
  uploadedVideos: ProductVideo[] = [];
  filePreviews: FilePreview[] = [];

  isUploading: boolean = false;
  uploadProgress: number = 0;
  isDragOver: boolean = false;

  // File compression settings
  readonly MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
  readonly MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 12MB
  readonly IMAGE_QUALITY = 0.8;
  readonly MAX_IMAGE_WIDTH = 1920;
  readonly MAX_IMAGE_HEIGHT = 1080;

  // Make Math available in template
  Math = Math;

  // Template helper methods to avoid inline arrow functions
  get imageCount(): number {
    return this.filePreviews.filter(f => f.type === 'image').length;
  }

  get videoCount(): number {
    return this.filePreviews.filter(f => f.type === 'video').length;
  }

  get isImageUploadDisabled(): boolean {
    return this.imageCount >= 10;
  }

  get isVideoUploadDisabled(): boolean {
    return this.videoCount >= 3;
  }

  // Location data
  provinces: Province[] = [];
  departments: Department[] = [];
  settlements: Settlement[] = [];

  selectedProvinceId: string = '';
  selectedDepartmentId: string = '';
  selectedSettlementId: string = '';

  // Category-specific properties
  selectedCategory: string = '';
  showWeaningField: boolean = false;

  // Chips arrays for dynamic fields
  healthCertificates: string[] = [];
  activeIngredients: string[] = [];
  requiredLicenses: string[] = [];

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private locationService: LocationService,
    private sellerService: SellerService,
    private dialog: MatDialog,
    private toastService: ToastService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Check seller profile status when component initializes
    this.checkSellerProfileAndShowModal();

    this.productForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      price_type: ['fixed', Validators.required],
      currency: ['ARS', Validators.required],
      province: ['', Validators.required],
      province_name: [''],
      department: [''],
      department_name: [''],
      settlement: [''],
      settlement_name: [''],
      city: [''],
      location_coordinates: this.fb.group({
        lat: [''],
        lng: ['']
      }),
      pickup_available: [false],
      delivery_available: [false],
      user_id: [''],
      is_active: [true],
      is_featured: [false],
      seller_name: [''],
      tags: [[]],
      images: [[]],

      // Transport details
      vehicle_type: [''],
      capacity_tons: [''],
      capacity_cubic_meters: [''],
      price_per_km: [''],
      has_refrigeration: [false],
      has_livestock_equipment: [false],
      min_distance_km: [''],
      max_distance_km: [''],
      license_plate: [''],
      license_expiry: [''],
      insurance_expiry: [''],
      vehicle_year: [''],

      // Livestock details  
      animal_type: [''],
      breed: [''],
      age_months: [''],
      weight_kg: [''],
      gender: [''],
      last_veterinary_check: [''],
      is_pregnant: [false],
      is_castrated: [false],
      is_weaned: [false],
      genetic_information: [''],

      // Supplies details
      supply_type: [''],
      brand: [''],
      model: [''],
      concentration: [''],
      expiry_date: [''],
      batch_number: [''],
      registration_number: [''],
      storage_requirements: [''],
      handling_instructions: [''],
      disposal_instructions: ['']
    });

    this.loadProvinces();

    // Subscribe to category changes to show/hide specific fields - optimized for instant response
    this.productForm.get('category')?.valueChanges.subscribe(category => {
      // Update immediately without any delay
      setTimeout(() => {
        this.selectedCategory = category;
        this.updateCategoryValidations(category);
      }, 0);
    });

    // Subscribe to gender changes to handle pregnancy field visibility
    this.productForm.get('gender')?.valueChanges.subscribe(gender => {
      // If gender is not 'hembra', clear the is_pregnant field
      if (gender !== 'hembra') {
        this.productForm.get('is_pregnant')?.setValue(false);
      }
    });

    // Check for product ID from route parameter
    const routeProductId = this.route.snapshot.paramMap.get('id');
    const isEditQueryParam = this.route.snapshot.queryParams['edit'];

    if (routeProductId) {
      this.productId = routeProductId;
      // Solo permitir edición si el query param 'edit' está presente
      this.isEditMode = isEditQueryParam === 'true';
      this.loadProductData(this.productId);
      this.loadProductImages(this.productId);
      this.loadProductVideos(this.productId);
    }
  }

  loadProductData(id: string): void {
    this.productService.getProduct(id).subscribe({
      next: (product) => {
        if (product) {
          // Map backend categories to frontend values
          const categoryMapping: { [key: string]: string } = {
            'livestock': 'Ganado',
            'supplies': 'Insumo',
            'transport': 'Transporte'
          };

          const mappedCategory = product.category && categoryMapping[product.category]
            ? categoryMapping[product.category]
            : product.category;

          // Update form with product data
          this.productForm.patchValue({
            title: product.title,
            description: product.description,
            category: mappedCategory,
            price: product.price,
            price_type: product.price_type,
            currency: product.currency,
            province: product.province,
            province_name: product.province_name || '',
            department: product.department,
            department_name: product.department_name || '',
            settlement: product.settlement,
            settlement_name: product.settlement_name || '',
            city: product.city,
            pickup_available: product.pickup_available,
            delivery_available: product.delivery_available,
            seller_name: product.seller_name,
            tags: product.tags || [],
            images: product.images || []
          });

          // Load location data if province exists
          if (product.province) {
            this.selectedProvinceId = product.province;
            this.loadDepartments(product.province);
            this.loadSettlements(product.province);

            if (product.department) {
              this.selectedDepartmentId = product.department;
              this.loadSettlementsByDepartment(product.province, product.department);
            }

            if (product.settlement) {
              this.selectedSettlementId = product.settlement;
            }
          }

          // Load category-specific details
          this.loadCategorySpecificDetails(product);

          // Only enable form if we're in edit mode, otherwise disable for viewing
          if (!this.isEditMode) {
            this.productForm.disable();
          }
        }
      },
      error: (error) => {
        console.error('Error loading product:', error);
      }
    });
  }

  loadProductImages(productId: string): void {
    this.productService.getProductImages(productId).subscribe({
      next: (images: ProductImage[]) => {
        this.uploadedImages = images;
        this.productForm.get('images')?.setValue(this.uploadedImages);
      },
      error: (error: any) => {
        console.error('Error loading product images:', error);
      }
    });
  }

  loadProductVideos(productId: string): void {
    this.productService.getProduct(productId).subscribe({
      next: (product: Product) => {
        if (product.videos && product.videos.length > 0) {
          this.uploadedVideos = product.videos;
        }
      },
      error: (error: any) => {
        console.error('Error loading product videos:', error);
      }
    });
  }

  async onFileChange(event: any, type: 'image' | 'video'): Promise<void> {
    const files: FileList = event.target.files;
    if (files.length === 0) {
      return;
    }

    // Validate file count
    const currentFileCount = this.filePreviews.length;
    const maxFiles = type === 'image' ? 10 : 3;

    if (currentFileCount + files.length > maxFiles) {
      this.showNotification(`Máximo ${maxFiles} ${type === 'image' ? 'imágenes' : 'videos'} permitidos`, 'error');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      // Process files with compression
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 50; // First 50% for processing
        this.uploadProgress = progress;

        const preview = await this.processFile(file, type);
        if (preview) {
          this.filePreviews.push(preview);
        }
      }

      // Force change detection to update template
      this.cdr.detectChanges();

      // Upload files if in edit mode
      if (this.isEditMode && this.productId) {
        await this.uploadProcessedFiles();
      }

    } catch (error) {
      console.error('Error processing files:', error);
      this.showNotification('Error al procesar archivos', 'error');
    } finally {
      this.isUploading = false;
      this.uploadProgress = 0;
      // Clear file input
      event.target.value = '';
    }
  }

  private async processFile(file: File, type: 'image' | 'video'): Promise<FilePreview | null> {
    try {
      // Validate file type
      if (type === 'image' && !file.type.startsWith('image/')) {
        this.showNotification(`${file.name} no es una imagen válida`, 'error');
        return null;
      }
      if (type === 'video' && !file.type.startsWith('video/')) {
        this.showNotification(`${file.name} no es un video válido`, 'error');
        return null;
      }

      // Create preview URL
      const url = URL.createObjectURL(file);
      const originalSize = file.size;

      let processedFile = file;
      let compressedSize = originalSize;
      let compressed = false;

      // Compress images
      if (type === 'image' && file.size > this.MAX_IMAGE_SIZE) {
        try {
          processedFile = await this.compressImage(file);
          compressedSize = processedFile.size;
          compressed = true;
        } catch (error) {
          console.warn('Image compression failed, using original:', error);
        }
      }

      // Validate video size
      if (type === 'video' && file.size > this.MAX_VIDEO_SIZE) {
        this.showNotification(`El video ${file.name} es demasiado grande (máximo 100MB)`, 'error');
        return null;
      }

      return {
        file: processedFile,
        url,
        type,
        compressed,
        originalSize,
        compressedSize
      };

    } catch (error) {
      console.error('Error processing file:', error);
      this.showNotification(`Error al procesar ${file.name}`, 'error');
      return null;
    }
  }

  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          const ratio = Math.min(this.MAX_IMAGE_WIDTH / width, this.MAX_IMAGE_HEIGHT / height);

          if (ratio < 1) {
            width *= ratio;
            height *= ratio;
          }

          // Set canvas size
          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            this.IMAGE_QUALITY
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async uploadProcessedFiles(): Promise<void> {
    if (!this.productId) return;

    const filesToUpload = this.filePreviews.filter(preview =>
      preview.type === 'image' // Only upload images for now
    );

    for (let i = 0; i < filesToUpload.length; i++) {
      const preview = filesToUpload[i];
      const progress = 50 + ((i + 1) / filesToUpload.length) * 50; // Second 50% for uploading
      this.uploadProgress = progress;

      try {
        const isPrimary = this.uploadedImages.length === 0 && i === 0;
        const displayOrder = this.uploadedImages.length + i + 1;

        // Images are now processed during product creation/update, not separately
      } catch (error) {
        console.error(`Error uploading ${preview.file.name}:`, error);
        this.showNotification(`Error al subir ${preview.file.name}`, 'error');
      }
    }

    // Update form
    this.productForm.get('images')?.setValue(this.uploadedImages);
    this.showNotification(`${filesToUpload.length} archivo(s) subido(s) exitosamente`, 'success');
  }

  removeFile(index: number): void {
    const preview = this.filePreviews[index];
    if (preview) {
      // Revoke object URL to free memory
      URL.revokeObjectURL(preview.url);
      this.filePreviews.splice(index, 1);
    }
  }

  getFileSizeText(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    else return Math.round(bytes / 1048576) + ' MB';
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    const title = type === 'success' ? 'Éxito' : type === 'error' ? 'Error' : 'Advertencia';

    switch (type) {
      case 'success':
        this.toastService.showSuccess(message, title);
        break;
      case 'error':
        this.toastService.showError(message, title);
        break;
      case 'warning':
        this.toastService.showWarning(message, title);
        break;
    }
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  private handleFiles(files: FileList): void {
    const imageFiles: File[] = [];
    const videoFiles: File[] = [];

    // Separar archivos por tipo
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else if (file.type.startsWith('video/')) {
        videoFiles.push(file);
      }
    });

    // Procesar imágenes
    if (imageFiles.length > 0) {
      const event = { target: { files: imageFiles } } as any;
      this.onFileChange(event, 'image');
    }

    // Procesar videos
    if (videoFiles.length > 0) {
      const event = { target: { files: videoFiles } } as any;
      this.onFileChange(event, 'video');
    }
  }

  /**
   * Get the display URL for an existing uploaded image
   */
  getImageDisplayUrl(image: ProductImage): string {
    if (!image.image_url) {
      return '';
    }

    // The image_url from the API is already the correct URL, use it directly
    return image.image_url;
  }

  onSubmit(): void {
    if (this.productForm.valid && !this.isUploading) {
      const productData = {
        ...this.productForm.value
      };

      // Remove fields that are not needed or handled separately
      delete productData.images;
      delete productData.location_coordinates; // Remove empty coordinates
      delete productData.user_id; // Backend will set this
      delete productData.seller_name; // Backend will set this

      // Map frontend categories to backend values
      const categoryMapping: { [key: string]: string } = {
        'Ganado': 'livestock',
        'Insumo': 'supplies',
        'Transporte': 'transport'
      };

      if (productData.category && categoryMapping[productData.category]) {
        productData.category = categoryMapping[productData.category];
      }

      // Prepare category-specific details first
      this.prepareCategorySpecificData(productData);

      // Convert date fields after preparing category-specific details (to include dates in nested objects)
      this.convertDateFieldsToISO(productData);

      // Get uploaded image files if any (for new uploads)
      const imageFiles: File[] = [];
      // Note: In a real implementation, you would track newly uploaded files
      // For now, we'll just use empty array since images are handled separately

      if (this.isEditMode && this.productId) {
        // Get new media files from filePreviews
        const newImageFiles: File[] = this.filePreviews
          .filter(preview => preview.type === 'image')
          .map(preview => preview.file);

        const newVideoFiles: File[] = this.filePreviews
          .filter(preview => preview.type === 'video')
          .map(preview => preview.file);

        // Update existing product
        this.productService.updateProductWithMedia(this.productId, productData, newImageFiles, newVideoFiles, this.uploadedImages).subscribe({
          next: (response) => {
            this.toastService.showSuccess('Producto actualizado exitosamente', 'Éxito');
            this.router.navigate(['/my-products']);
          },
          error: (error) => {
            console.error('Error al actualizar producto:', error);
            this.toastService.showError('Error al actualizar producto', 'Error');
          }
        });
      } else {
        // Extract media files from filePreviews for new products
        const imageFiles: File[] = this.filePreviews
          .filter(preview => preview.type === 'image')
          .map(preview => preview.file);

        const videoFiles: File[] = this.filePreviews
          .filter(preview => preview.type === 'video')
          .map(preview => preview.file);

        if (imageFiles.length > 0 || videoFiles.length > 0) {
          // Use FormData method for products with media
          this.productService.createProductWithMedia(productData, imageFiles, videoFiles).subscribe({
            next: (response) => {
              this.toastService.showSuccess('¡Producto creado exitosamente!', 'Éxito');
              this.router.navigate(['/my-products']);
            },
            error: (error) => {
              console.error('Error creating product:', error);
              this.toastService.showError('Error al crear el producto', 'Error');
            }
          });
        } else {
          // Use regular JSON method for products without media
          this.productService.createProduct(productData).subscribe({
            next: (response) => {
              this.toastService.showSuccess('¡Producto creado exitosamente!', 'Éxito');
              this.router.navigate(['/my-products']);
            },
            error: (error) => {
              console.error('Error creating product:', error);
              this.toastService.showError('Error al crear el producto', 'Error');
            }
          });
        }
      }
    } else {
      this.toastService.showWarning('Por favor completa todos los campos requeridos', 'Advertencia');
    }
  }

  removeImage(imageId: string): void {
    // Remove image from local array for immediate UI feedback
    this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
    this.productForm.get('images')?.setValue(this.uploadedImages);

    if (this.isEditMode && this.productId) {
      // For existing products, update immediately on the backend
      this.updateProductWithCurrentImages();
    }
  }

  removeVideo(videoId: string): void {
    // Remove video from local array for immediate UI feedback
    this.uploadedVideos = this.uploadedVideos.filter(vid => vid.id !== videoId);

    if (this.isEditMode && this.productId) {
      // Delete video from backend
      this.productService.deleteVideo(videoId).subscribe({
        next: () => {
          this.toastService.showSuccess('Video eliminado exitosamente', 'Éxito');
        },
        error: (error) => {
          console.error('Error deleting video:', error);
          this.toastService.showError('Error al eliminar video', 'Error');
          // Reload videos on error
          this.loadProductVideos(this.productId!);
        }
      });
    }
  }

  private updateProductWithCurrentImages(): void {
    if (!this.productId) return;

    // Create updated product data
    const productData = {
      ...this.productForm.value
    };

    // Remove fields that are not needed or handled separately
    delete productData.images;
    delete productData.location_coordinates;
    delete productData.user_id;
    delete productData.seller_name;

    // Map frontend categories to backend values
    const categoryMapping: { [key: string]: string } = {
      'Ganado': 'livestock',
      'Insumo': 'supplies',
      'Transporte': 'transport'
    };

    if (productData.category && categoryMapping[productData.category]) {
      productData.category = categoryMapping[productData.category];
    }

    // Prepare category-specific details first
    this.prepareCategorySpecificData(productData);

    // Convert date fields to ISO format after preparing category-specific details
    this.convertDateFieldsToISO(productData);

    // Get new image files from filePreviews (if any)
    const newImageFiles: File[] = this.filePreviews
      .filter(preview => preview.type === 'image')
      .map(preview => preview.file);

    // Update product - this will sync the current state of uploadedImages with the backend
    this.productService.updateProductWithImages(this.productId, productData, newImageFiles, this.uploadedImages).subscribe({
      next: (response) => {
        this.showNotification('Imagen eliminada exitosamente', 'success');

        // Clear any new file previews since they've been processed
        this.filePreviews = [];

        // Reload images to get the updated state from server
        this.loadProductImages(this.productId!);
      },
      error: (error: any) => {
        console.error('Error updating product after image removal:', error);
        this.showNotification('Error al eliminar la imagen. Intenta de nuevo.', 'error');

        // Reload images to restore correct state
        if (this.productId) {
          this.loadProductImages(this.productId);
        }
      }
    });
  }

  setPrimaryImage(imageId: string): void {
    // Update image primary status locally - will be synced on next save/update
    this.uploadedImages.forEach(img => {
      img.is_primary = img.id === imageId;
    });
  }

  updateImageOrder(imageId: string, newOrder: number): void {
    // Update image order locally - will be synced on next save/update
    const image = this.uploadedImages.find(img => img.id === imageId);
    if (image) {
      image.display_order = newOrder;
    }
  }

  // Seller profile check methods
  private checkSellerProfileAndShowModal(): void {
    this.sellerService.checkSellerProfileComplete().subscribe({
      next: (response) => {
        if (!response.is_complete) {
          this.showSellerSetupModal();
        }
      },
      error: (error) => {
        console.error('Error checking seller profile:', error);
        // If there's an error checking, still show the modal to be safe
        this.showSellerSetupModal();
      }
    });
  }

  private showSellerSetupModal(): void {
    const dialogRef = this.dialog.open(SellerSetupModalComponent, {
      width: '90%',
      maxWidth: '700px',
      disableClose: true, // Prevent closing by clicking outside
      panelClass: 'seller-setup-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // User completed the seller setup
        this.toastService.showSuccess('¡Perfil configurado! Ahora puedes publicar productos', 'Éxito');
      } else {
        // User cancelled - redirect back to marketplace
        this.toastService.showWarning('Debes completar tu perfil de vendedor para publicar productos', 'Advertencia');
        this.router.navigate(['/marketplace']);
      }
    });
  }

  // Location methods
  loadProvinces(): void {
    this.locationService.getProvinces({ max: 50 }).subscribe({
      next: (response) => {
        this.provinces = response.provincias;
      },
      error: (error) => {
        console.error('Error al cargar provincias:', error);
      }
    });
  }

  onProvinceChange(event: any): void {
    const provinceId = event.value || event.target?.value;
    this.selectedProvinceId = provinceId;

    // Find province name
    const selectedProvince = this.provinces.find(p => p.id === provinceId);
    const provinceName = selectedProvince?.nombre || '';

    // Clear dependent selects
    this.departments = [];
    this.settlements = [];
    this.selectedDepartmentId = '';
    this.selectedSettlementId = '';

    this.productForm.patchValue({
      province_name: provinceName,
      department: '',
      department_name: '',
      settlement: '',
      settlement_name: ''
    });

    if (provinceId) {
      this.loadDepartments(provinceId);
      this.loadSettlements(provinceId);
    }
  }

  onDepartmentChange(event: any): void {
    const departmentId = event.value || event.target?.value;
    this.selectedDepartmentId = departmentId;

    // Find department name
    const selectedDepartment = this.departments.find(d => d.id === departmentId);
    const departmentName = selectedDepartment?.nombre || '';

    this.settlements = [];
    this.productForm.patchValue({
      department_name: departmentName,
      settlement: '',
      settlement_name: ''
    });

    if (departmentId && this.selectedProvinceId) {
      this.loadSettlementsByDepartment(this.selectedProvinceId, departmentId);
    }
  }

  onSettlementChange(event: any): void {
    const settlementId = event.value || event.target?.value;
    this.selectedSettlementId = settlementId;

    // Find settlement name
    const selectedSettlement = this.settlements.find(s => s.id === settlementId);
    const settlementName = selectedSettlement?.nombre || '';

    this.productForm.patchValue({
      settlement_name: settlementName
    });
  }

  checkAgeForWeaning(): void {
    const ageMonths = this.productForm.get('age_months')?.value;
    this.showWeaningField = ageMonths !== null && ageMonths !== undefined && ageMonths <= 15;
  }

  loadDepartments(provinceId: string): void {
    this.locationService.getDepartments({ provincia: provinceId, max: 50 }).subscribe({
      next: (response) => {
        this.departments = response.departamentos || [];
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
        this.departments = [];
      }
    });
  }

  loadSettlements(provinceId: string): void {
    this.locationService.getSettlements({ provincia: provinceId, max: 100 }).subscribe({
      next: (response) => {
        this.settlements = response.asentamientos || [];
      },
      error: (error) => {
        console.error('Error al cargar asentamientos:', error);
        this.settlements = [];
      }
    });
  }

  loadSettlementsByDepartment(provinceId: string, departmentId: string): void {
    this.locationService.getSettlements({ provincia: provinceId, departamento: departmentId, max: 100 }).subscribe({
      next: (response) => {
        this.settlements = response.asentamientos || [];
      },
      error: (error) => {
        console.error('Error al cargar asentamientos por departamento:', error);
        this.settlements = [];
      }
    });
  }

  // Navigation method
  goBack(): void {
    if (this.isEditMode) {
      // Si estamos editando, volver a mis productos
      this.router.navigate(['/my-products']);
    } else {
      // Si estamos creando, volver al marketplace
      this.router.navigate(['/marketplace']);
    }
  }

  // Category-specific methods
  getCategoryDisplayName(category: string): string {
    const displayNames: { [key: string]: string } = {
      'Ganado': 'Ganado',
      'Insumo': 'Insumos Agrícolas',
      'Transporte': 'Transporte'
    };
    return displayNames[category] || category;
  }

  updateCategoryValidations(category: string): void {
    if (!category) return;

    // Reset all validations first
    this.clearCategoryValidations();

    // Set validators based on category
    const validatorMap: { [key: string]: { [field: string]: any[] } } = {
      'Transporte': {
        'vehicle_type': [Validators.required],
        'capacity_tons': [Validators.min(0)],
        'capacity_cubic_meters': [Validators.min(0)],
        'price_per_km': [Validators.min(0)],
        'min_distance_km': [Validators.min(0)],
        'max_distance_km': [Validators.min(0)],
        'vehicle_year': [Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]
      },
      'Ganado': {
        'animal_type': [Validators.required],
        'age_months': [Validators.min(0)],
        'weight_kg': [Validators.min(0)]
      },
      'Insumo': {
        'supply_type': [Validators.required]
      }
    };

    const validators = validatorMap[category];
    if (validators) {
      Object.keys(validators).forEach(field => {
        this.productForm.get(field)?.setValidators(validators[field]);
        this.productForm.get(field)?.updateValueAndValidity();
      });
    }
  }

  private clearCategoryValidations(): void {
    const categoryFields = [
      'vehicle_type', 'capacity_tons', 'capacity_cubic_meters', 'price_per_km',
      'has_refrigeration', 'has_livestock_equipment', 'min_distance_km', 'max_distance_km',
      'license_plate', 'license_expiry', 'insurance_expiry', 'vehicle_year',
      'animal_type', 'breed', 'age_months', 'weight_kg', 'gender',
      'last_veterinary_check', 'is_pregnant', 'is_castrated', 'is_weaned', 'genetic_information',
      'supply_type', 'brand', 'model', 'concentration', 'expiry_date',
      'batch_number', 'registration_number', 'storage_requirements',
      'handling_instructions', 'disposal_instructions'
    ];

    categoryFields.forEach(field => {
      this.productForm.get(field)?.clearValidators();
      this.productForm.get(field)?.updateValueAndValidity();
    });
  }

  // Chip management methods for livestock
  addHealthCertificate(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.healthCertificates.push(value);
    }
    event.chipInput!.clear();
  }

  removeHealthCertificate(certificate: string): void {
    const index = this.healthCertificates.indexOf(certificate);
    if (index >= 0) {
      this.healthCertificates.splice(index, 1);
    }
  }

  // Chip management methods for supplies
  addIngredient(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.activeIngredients.push(value);
    }
    event.chipInput!.clear();
  }

  removeIngredient(ingredient: string): void {
    const index = this.activeIngredients.indexOf(ingredient);
    if (index >= 0) {
      this.activeIngredients.splice(index, 1);
    }
  }

  addLicense(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.requiredLicenses.push(value);
    }
    event.chipInput!.clear();
  }

  removeLicense(license: string): void {
    const index = this.requiredLicenses.indexOf(license);
    if (index >= 0) {
      this.requiredLicenses.splice(index, 1);
    }
  }

  private prepareCategorySpecificData(productData: any): void {
    const category = productData.category;

    // Clean up category-specific fields based on selected category
    const transportFields = ['vehicle_type', 'capacity_tons', 'capacity_cubic_meters', 'price_per_km', 'has_refrigeration', 'has_livestock_equipment', 'min_distance_km', 'max_distance_km', 'license_plate', 'license_expiry', 'insurance_expiry', 'vehicle_year'];
    const livestockFields = ['animal_type', 'breed', 'age_months', 'weight_kg', 'gender', 'last_veterinary_check', 'is_pregnant', 'is_castrated', 'is_weaned', 'genetic_information'];
    const suppliesFields = ['supply_type', 'brand', 'model', 'concentration', 'expiry_date', 'batch_number', 'registration_number', 'storage_requirements', 'handling_instructions', 'disposal_instructions'];

    // Remove all category-specific fields first
    [...transportFields, ...livestockFields, ...suppliesFields].forEach(field => {
      delete productData[field];
    });

    // Add category-specific details based on selected category
    switch (category) {
      case 'transport':
        const transportDetails: Partial<TransportDetails> = {};
        transportFields.forEach(field => {
          const value = this.productForm.get(field)?.value;
          if (value !== null && value !== undefined && value !== '') {
            (transportDetails as any)[field] = value;
          }
        });

        // Add service provinces array (for now using current province)
        if (productData.province) {
          transportDetails.service_provinces = [productData.province];
        }

        if (Object.keys(transportDetails).length > 0) {
          productData.transport_details = transportDetails;
        }
        break;

      case 'livestock':
        const livestockDetails: Partial<LivestockDetails> = {};

        livestockFields.forEach(field => {
          const value = this.productForm.get(field)?.value;
          if (value !== null && value !== undefined && value !== '') {
            (livestockDetails as any)[field] = value;
          }
        });

        // Only add health_certificates if there are actual certificates
        if (this.healthCertificates && this.healthCertificates.length > 0) {
          livestockDetails.health_certificates = this.healthCertificates;
        }

        if (Object.keys(livestockDetails).length > 0) {
          productData.livestock_details = livestockDetails;
        }
        break;

      case 'supplies':
        const suppliesDetails: Partial<SuppliesDetails> = {};

        suppliesFields.forEach(field => {
          const value = this.productForm.get(field)?.value;
          if (value !== null && value !== undefined && value !== '') {
            (suppliesDetails as any)[field] = value;
          }
        });

        // Only add arrays if they have content
        if (this.activeIngredients && this.activeIngredients.length > 0) {
          suppliesDetails.active_ingredients = this.activeIngredients;
        }
        if (this.requiredLicenses && this.requiredLicenses.length > 0) {
          suppliesDetails.required_licenses = this.requiredLicenses;
        }

        if (Object.keys(suppliesDetails).length > 0) {
          productData.supplies_details = suppliesDetails;
        }
        break;
    }
  }

  private loadCategorySpecificDetails(product: Product): void {
    // Map backend category to frontend
    const backendToFrontendCategory: { [key: string]: string } = {
      'livestock': 'Ganado',
      'supplies': 'Insumo',
      'transport': 'Transporte'
    };

    const frontendCategory = backendToFrontendCategory[product.category] || product.category;
    this.selectedCategory = frontendCategory;

    // Load category-specific details
    if (product.transport_details) {
      this.loadTransportDetails(product.transport_details);
    }

    if (product.livestock_details) {
      this.loadLivestockDetails(product.livestock_details);
    }

    if (product.supplies_details) {
      this.loadSuppliesDetails(product.supplies_details);
    }
  }

  private loadTransportDetails(details: TransportDetails): void {
    // Convert ISO dates to input format before patching form
    const detailsCopy = { ...details };
    this.convertISODatesToInputFormat(detailsCopy);

    this.productForm.patchValue({
      vehicle_type: detailsCopy.vehicle_type,
      capacity_tons: detailsCopy.capacity_tons,
      capacity_cubic_meters: detailsCopy.capacity_cubic_meters,
      price_per_km: detailsCopy.price_per_km,
      has_refrigeration: detailsCopy.has_refrigeration,
      has_livestock_equipment: detailsCopy.has_livestock_equipment,
      min_distance_km: detailsCopy.min_distance_km,
      max_distance_km: detailsCopy.max_distance_km,
      license_plate: detailsCopy.license_plate,
      license_expiry: detailsCopy.license_expiry,
      insurance_expiry: detailsCopy.insurance_expiry,
      vehicle_year: detailsCopy.vehicle_year
    });
  }

  private loadLivestockDetails(details: LivestockDetails): void {
    // Convert ISO dates to input format before patching form
    const detailsCopy = { ...details };
    this.convertISODatesToInputFormat(detailsCopy);

    this.productForm.patchValue({
      animal_type: detailsCopy.animal_type,
      breed: detailsCopy.breed,
      age_months: detailsCopy.age_months,
      weight_kg: detailsCopy.weight_kg,
      gender: detailsCopy.gender,
      last_veterinary_check: detailsCopy.last_veterinary_check,
      is_pregnant: detailsCopy.is_pregnant,
      is_castrated: detailsCopy.is_castrated,
      is_weaned: detailsCopy.is_weaned,
      genetic_information: detailsCopy.genetic_information
    });

    // Check if weaning field should be shown
    this.checkAgeForWeaning();

    // Load health certificates
    if (details.health_certificates) {
      this.healthCertificates = [...details.health_certificates];
    }
  }

  private loadSuppliesDetails(details: SuppliesDetails): void {
    // Convert ISO dates to input format before patching form
    const detailsCopy = { ...details };
    this.convertISODatesToInputFormat(detailsCopy);

    this.productForm.patchValue({
      supply_type: detailsCopy.supply_type,
      brand: detailsCopy.brand,
      model: detailsCopy.model,
      concentration: detailsCopy.concentration,
      expiry_date: detailsCopy.expiry_date,
      batch_number: detailsCopy.batch_number,
      registration_number: detailsCopy.registration_number,
      storage_requirements: detailsCopy.storage_requirements,
      handling_instructions: detailsCopy.handling_instructions,
      disposal_instructions: detailsCopy.disposal_instructions
    });

    // Load active ingredients and required licenses
    if (details.active_ingredients) {
      this.activeIngredients = [...details.active_ingredients];
    }
    if (details.required_licenses) {
      this.requiredLicenses = [...details.required_licenses];
    }
  }

  private convertDateFieldsToISO(productData: any): void {
    const dateFields = [
      'license_expiry',
      'insurance_expiry',
      'last_veterinary_check',
      'expiry_date'
    ];

    // Convert dates in the root level
    dateFields.forEach(field => {
      if (productData[field]) {
        productData[field] = this.formatDateToISO(productData[field]);
      }
    });

    // Convert dates in category-specific details
    const detailsObjects = ['transport_details', 'livestock_details', 'supplies_details'];
    detailsObjects.forEach(detailsKey => {
      if (productData[detailsKey]) {
        dateFields.forEach(field => {
          if (productData[detailsKey][field]) {
            productData[detailsKey][field] = this.formatDateToISO(productData[detailsKey][field]);
          }
        });
      }
    });
  }

  private formatDateToISO(dateValue: any): string | null {
    // If field is empty, null, or undefined, return null
    if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
      return null;
    }

    // Convert date using Angular's formatDate with timezone
    try {
      // Parse date string as local date (avoid timezone conversion)
      let date: Date;
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // For YYYY-MM-DD format, parse as local date
        const [year, month, day] = dateValue.split('-').map(Number);
        date = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        date = new Date(dateValue);
      }

      // Format date part and manually append timezone
      const datePart = formatDate(date, "yyyy-MM-dd'T'00:00:00.00", 'en-US');
      const formatted = `${datePart}-03:00`;
      return formatted;
    } catch (error) {
      console.error(`Error formatting date ${dateValue}:`, error);
      return null;
    }
  }

  private convertISODatesToInputFormat(data: any): void {
    const dateFields = [
      'license_expiry',
      'insurance_expiry',
      'last_veterinary_check',
      'expiry_date'
    ];

    dateFields.forEach(field => {
      const dateValue = data[field];
      if (dateValue) {
        try {
          // Extract date part (YYYY-MM-DD) from any date format for input[type="date"]
          const date = new Date(dateValue);
          data[field] = formatDate(date, 'yyyy-MM-dd', 'en-US');
        } catch (error) {
          console.error(`Error converting date for field ${field}:`, error);
          delete data[field];
        }
      }
    });
  }
}