import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../core/services/product.service';
import { LocationService } from '../core/services/location.service';
import { Product, ProductImage } from '../core/models/product.model';
import { Province, Department, Settlement } from '../core/models/location.model';
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
    private route: ActivatedRoute
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
    if (routeProductId) {
      this.productId = routeProductId;
    }

    if (this.productId) {
      this.isEditMode = true;
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

          // Disable form in edit mode
          this.productForm.disable();
        }
      },
      error: (error) => {
        console.error('Error loading product:', error);
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
    const provinceId = event.target.value;
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
    const departmentId = event.target.value;
    this.selectedDepartmentId = departmentId;
    
    this.settlements = [];
    this.productForm.patchValue({ settlement: '' });

    if (departmentId && this.selectedProvinceId) {
      this.loadSettlementsByDepartment(this.selectedProvinceId, departmentId);
    }
  }


  onSettlementChange(event: any): void {
    this.selectedSettlementId = event.target.value;
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