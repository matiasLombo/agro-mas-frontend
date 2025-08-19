import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  price_type: string;
  currency: string;
  unit?: string;
  quantity?: number;
  available_from?: string;
  available_until?: string;
  is_active: boolean;
  is_featured: boolean;
  province?: string;
  city?: string;
  location_coordinates?: {
    lng: number;
    lat: number;
  };
  pickup_available: boolean;
  delivery_available: boolean;
  delivery_radius?: number;
  seller_name: string;
  seller_phone?: string;
  seller_rating?: number;
  seller_verification_level?: string;
  views_count: number;
  favorites_count: number;
  inquiries_count: number;
  search_keywords?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  expires_at?: string;
  metadata?: any;
  tags: string[];
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  cloud_storage_path?: string;
  alt_text?: string;
  is_primary: boolean;
  display_order: number;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}

export interface ProductSearchRequest {
  query?: string;
  category?: string;
  subcategory?: string;
  province?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  price_type?: string;
  pickup_available?: boolean;
  delivery_available?: boolean;
  is_verified_seller?: boolean;
  tags?: string[];
  sort_by?: string;
  page?: number;
  page_size?: number;
}

export interface ProductSearchResponse {
  products: Product[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

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
}