import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../core/services/product.service';
import { Product, ProductImage } from '../core/models/product.model';
import { Observable, forkJoin } from 'rxjs';

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

  isUploading: boolean = false;
  uploadProgress: number = 0;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService
  ) { }

  ngOnInit(): void {
    // ... (El código de ngOnInit no cambia)
    this.productForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      price_type: ['fixed', Validators.required],
      currency: ['ARS', Validators.required],
      province: [''],
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

    if (this.productId) {
      this.isEditMode = true;
      this.loadProductData(this.productId);
      this.loadProductImages(this.productId);
    }
  }

  loadProductData(id: string): void {
    this.productService.getProduct(id).subscribe(product => {
      if (product) {
        this.productForm.patchValue(product);
        this.productForm.disable();
      }
    });
  }

  loadProductImages(productId: string): void {
    this.productService.getProductImages(productId).subscribe(images => {
      this.uploadedImages = images;
    });
  }


  async onFileChange(event: any, type: 'images' | 'videos'): Promise<void> {
    const files: FileList = event.target.files;
    if (files.length === 0) return;

    if (!this.productId) {
      console.error('Product ID is required to upload images');
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;

    const uploadObservables = Array.from(files).map((file: File, index) => {
      const isPrimary = this.uploadedImages.length === 0 && index === 0;
      const displayOrder = this.uploadedImages.length + index + 1;
      
      return this.productService.uploadProductImage(
        this.productId!,
        file,
        file.name,
        isPrimary,
        displayOrder
      );
    });

    try {
      const results = await forkJoin(uploadObservables).toPromise();
      if (results) {
        const newImages = results.map(result => result.image);
        this.uploadedImages.push(...newImages);
        this.productForm.get('images')?.setValue(this.uploadedImages);
      }
    } catch (error) {
      console.error('Error al subir archivos:', error);
    } finally {
      this.isUploading = false;
      this.uploadProgress = 0;
    }
  }

  onSubmit(): void {
    if (this.productForm.valid && !this.isUploading) {
      const productData = {
        ...this.productForm.value,
        user_id: 'some-user-id',
        seller_name: 'Nombre del Vendedor',
      };

      if (this.isEditMode) {
        console.log('Datos a enviar para actualizar:', productData);
      } else {
        console.log('Datos a enviar para publicar:', productData);
      }
    } else {
      console.log('Formulario no válido o subida en curso.');
    }
  }

  removeImage(imageId: string): void {
    this.productService.deleteProductImage(imageId).subscribe({
      next: () => {
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
        this.productForm.get('images')?.setValue(this.uploadedImages);
      },
      error: (error) => {
        console.error('Error al eliminar imagen:', error);
      }
    });
  }

  setPrimaryImage(imageId: string): void {
    this.productService.updateProductImage(imageId, { isPrimary: true }).subscribe({
      next: () => {
        this.uploadedImages.forEach(img => {
          img.is_primary = img.id === imageId;
        });
      },
      error: (error) => {
        console.error('Error al establecer imagen principal:', error);
      }
    });
  }

  updateImageOrder(imageId: string, newOrder: number): void {
    this.productService.updateProductImage(imageId, { displayOrder: newOrder }).subscribe({
      next: () => {
        const image = this.uploadedImages.find(img => img.id === imageId);
        if (image) {
          image.display_order = newOrder;
        }
      },
      error: (error) => {
        console.error('Error al actualizar orden de imagen:', error);
      }
    });
  }
}