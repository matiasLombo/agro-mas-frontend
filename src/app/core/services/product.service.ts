import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductSearchRequest, ProductSearchResponse, ProductImage } from '@core/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) { }

  /**
   * Search products with filters and pagination
   */
  searchProducts(request: ProductSearchRequest = {}): Observable<ProductSearchResponse> {
    let params = new HttpParams();

    if (request.query) params = params.set('query', request.query);
    if (request.category) params = params.set('category', request.category);
    if (request.subcategory) params = params.set('subcategory', request.subcategory);
    if (request.province) params = params.set('province', request.province);
    if (request.city) params = params.set('city', request.city);
    if (request.min_price !== undefined) params = params.set('min_price', request.min_price.toString());
    if (request.max_price !== undefined) params = params.set('max_price', request.max_price.toString());
    if (request.price_type) params = params.set('price_type', request.price_type);
    if (request.pickup_available !== undefined) params = params.set('pickup_available', request.pickup_available.toString());
    if (request.delivery_available !== undefined) params = params.set('delivery_available', request.delivery_available.toString());
    if (request.is_verified_seller !== undefined) params = params.set('is_verified_seller', request.is_verified_seller.toString());
    if (request.tags && request.tags.length > 0) {
      request.tags.forEach(tag => params = params.append('tags', tag));
    }
    if (request.sort_by) params = params.set('sort_by', request.sort_by);
    if (request.page) params = params.set('page', request.page.toString());
    if (request.page_size) params = params.set('page_size', request.page_size.toString());

    return this.http.get<ProductSearchResponse>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get a single product by ID
   */
  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get featured products (first page with default filters)
   */
  getFeaturedProducts(): Observable<ProductSearchResponse> {
    return this.searchProducts({
      sort_by: 'featured',
      page: 1,
      page_size: 6
    });
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string, page = 1, pageSize = 20): Observable<ProductSearchResponse> {
    return this.searchProducts({
      category,
      page,
      page_size: pageSize,
      sort_by: 'date_desc'
    });
  }

  /**
   * Upload an image for a product
   */
  uploadProductImage(productId: string, file: File, altText?: string, isPrimary = false, displayOrder?: number): Observable<{ image: ProductImage }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('product_id', productId);
    if (altText) formData.append('alt_text', altText);
    formData.append('is_primary', isPrimary.toString());
    if (displayOrder !== undefined) formData.append('display_order', displayOrder.toString());

    return this.http.post<{ image: ProductImage }>(`${this.apiUrl}/images`, formData);
  }

  /**
   * Update an existing product image
   */
  updateProductImage(imageId: string, updates: { altText?: string; isPrimary?: boolean; displayOrder?: number }): Observable<void> {
    const body: any = {};
    if (updates.altText !== undefined) body.alt_text = updates.altText;
    if (updates.isPrimary !== undefined) body.is_primary = updates.isPrimary;
    if (updates.displayOrder !== undefined) body.display_order = updates.displayOrder;

    return this.http.put<void>(`${this.apiUrl}/images/${imageId}`, body);
  }

  /**
   * Delete a product image
   */
  deleteProductImage(imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/images/${imageId}`);
  }

  /**
   * Get all images for a product
   */
  getProductImages(productId: string): Observable<ProductImage[]> {
    return this.http.get<ProductImage[]>(`${this.apiUrl}/${productId}/images`);
  }

  /**
   * Get a resized image URL
   */
  getResizedImageUrl(storagePath: string, width: number, height: number, quality = 80): string {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/resize/${storagePath}?w=${width}&h=${height}&q=${quality}`;
  }
}