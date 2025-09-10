import { Component, OnInit, Input, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { SellerService } from '../../services/seller.service';
import { Product, ProductImage } from '../../core/models/product.model';
import { Province, Department, Settlement } from '../../core/models/location.model';
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
  uploadedVideos: any[] = [];
  filePreviews: FilePreview[] = [];
  
  isUploading: boolean = false;
  uploadProgress: number = 0;
  isDragOver: boolean = false;
  
  // File compression settings
  readonly MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
  readonly MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
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

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private locationService: LocationService,
    private sellerService: SellerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
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
      department: [''],
      settlement: [''],
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
    });

    this.loadProvinces();

    // Check for product ID from route parameter
    const routeProductId = this.route.snapshot.paramMap.get('id');
    const isEditQueryParam = this.route.snapshot.queryParams['edit'];
    
    if (routeProductId) {
      this.productId = routeProductId;
      // Solo permitir edición si el query param 'edit' está presente
      this.isEditMode = isEditQueryParam === 'true';
      this.loadProductData(this.productId);
      this.loadProductImages(this.productId);
    }
  }

  loadProductData(id: string): void {
    this.productService.getProduct(id).subscribe({
      next: (product) => {
        if (product) {
          // Update form with product data
          this.productForm.patchValue({
            title: product.title,
            description: product.description,
            category: product.category,
            price: product.price,
            price_type: product.price_type,
            currency: product.currency,
            province: product.province,
            department: product.department,
            settlement: product.settlement,
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

  async onFileChange(event: any, type: 'image' | 'video'): Promise<void> {
    console.log('onFileChange called with type:', type, 'event:', event);
    const files: FileList = event.target.files;
    console.log('Files in onFileChange:', files, files?.length);
    if (files.length === 0) {
      console.log('No files found, returning early');
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
        this.showNotification(`El video ${file.name} es demasiado grande (máximo 10MB)`, 'error');
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
        console.log('Image will be processed with product creation/update');
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
    this.snackBar.open(message, 'Cerrar', {
      duration: type === 'error' ? 5000 : 3000,
      panelClass: [`snackbar-${type}`]
    });
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
    console.log('onDrop triggered!', event);
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    console.log('Files from drag & drop:', files, files?.length);
    if (files && files.length > 0) {
      console.log('Calling handleFiles with', files.length, 'files');
      this.handleFiles(files);
    } else {
      console.log('No files detected in drag & drop');
    }
  }

  private handleFiles(files: FileList): void {
    console.log('handleFiles called with', files.length, 'files');
    const imageFiles: File[] = [];
    const videoFiles: File[] = [];

    // Separar archivos por tipo
    Array.from(files).forEach(file => {
      console.log('Processing file:', file.name, 'type:', file.type);
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else if (file.type.startsWith('video/')) {
        videoFiles.push(file);
      }
    });

    console.log('Image files:', imageFiles.length, 'Video files:', videoFiles.length);

    // Procesar imágenes
    if (imageFiles.length > 0) {
      console.log('Processing', imageFiles.length, 'image files');
      const event = { target: { files: imageFiles } } as any;
      this.onFileChange(event, 'image');
    }

    // Procesar videos
    if (videoFiles.length > 0) {
      console.log('Processing', videoFiles.length, 'video files');
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
      
      console.log('Product data being sent:', productData);

      // Get uploaded image files if any (for new uploads)
      const imageFiles: File[] = [];
      // Note: In a real implementation, you would track newly uploaded files
      // For now, we'll just use empty array since images are handled separately

      if (this.isEditMode && this.productId) {
        // Get new image files from filePreviews
        const newImageFiles: File[] = this.filePreviews
          .filter(preview => preview.type === 'image')
          .map(preview => preview.file);

        // Update existing product
        this.productService.updateProductWithImages(this.productId, productData, newImageFiles, this.uploadedImages).subscribe({
          next: (response) => {
            console.log('Producto actualizado:', response);
            this.snackBar.open('Producto actualizado exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.router.navigate(['/my-products']);
          },
          error: (error) => {
            console.error('Error al actualizar producto:', error);
            this.snackBar.open('Error al actualizar producto', 'Cerrar', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        });
      } else {
        // Extract image files from filePreviews for new products
        const imageFiles: File[] = this.filePreviews
          .filter(preview => preview.type === 'image')
          .map(preview => preview.file);

        if (imageFiles.length > 0) {
          // Use FormData method for products with images
          this.productService.createProductWithImages(productData, imageFiles).subscribe({
            next: (response) => {
              this.snackBar.open('¡Producto creado exitosamente!', 'Cerrar', { duration: 3000 });
              this.router.navigate(['/my-products']);
            },
            error: (error) => {
              console.error('Error creating product:', error);
              this.snackBar.open('Error al crear el producto', 'Cerrar', { duration: 3000 });
            }
          });
        } else {
          // Use regular JSON method for products without images
          this.productService.createProduct(productData).subscribe({
            next: (response) => {
              this.snackBar.open('¡Producto creado exitosamente!', 'Cerrar', { duration: 3000 });
              this.router.navigate(['/my-products']);
            },
            error: (error) => {
              console.error('Error creating product:', error);
              this.snackBar.open('Error al crear el producto', 'Cerrar', { duration: 3000 });
            }
          });
        }
      }
    } else {
      console.log('Formulario no válido o subida en curso.');
      this.snackBar.open('Por favor completa todos los campos requeridos', 'Cerrar', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
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

    // Get new image files from filePreviews (if any)
    const newImageFiles: File[] = this.filePreviews
      .filter(preview => preview.type === 'image')
      .map(preview => preview.file);

    // Update product - this will sync the current state of uploadedImages with the backend
    this.productService.updateProductWithImages(this.productId, productData, newImageFiles, this.uploadedImages).subscribe({
      next: (response) => {
        console.log('Product updated after image removal:', response);
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
        this.snackBar.open('¡Perfil configurado! Ahora puedes publicar productos', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } else {
        // User cancelled - redirect back to marketplace
        this.snackBar.open('Debes completar tu perfil de vendedor para publicar productos', 'Cerrar', {
          duration: 4000,
          panelClass: ['warning-snackbar']
        });
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
    
    // Clear dependent selects
    this.departments = [];
    this.settlements = [];
    this.selectedDepartmentId = '';
    this.selectedSettlementId = '';
    
    this.productForm.patchValue({
      department: '',
      settlement: ''
    });

    if (provinceId) {
      this.loadDepartments(provinceId);
      this.loadSettlements(provinceId);
    }
  }

  onDepartmentChange(event: any): void {
    const departmentId = event.value || event.target?.value;
    this.selectedDepartmentId = departmentId;
    
    this.settlements = [];
    this.productForm.patchValue({ settlement: '' });

    if (departmentId && this.selectedProvinceId) {
      this.loadSettlementsByDepartment(this.selectedProvinceId, departmentId);
    }
  }

  onSettlementChange(event: any): void {
    this.selectedSettlementId = event.value || event.target?.value;
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
}