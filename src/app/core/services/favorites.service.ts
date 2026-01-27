import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ToggleFavoriteRequest {
  product_id: string;
}

export interface ToggleFavoriteResponse {
  is_favorited: boolean;
  message: string;
}

export interface CheckFavoritesRequest {
  product_ids: string[];
}

export interface CheckFavoritesResponse {
  favorites: { [productId: string]: boolean };
}

export interface FavoriteWithDetails {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
  product_title: string;
  product_description?: string;
  product_category: string;
  product_subcategory?: string;
  product_price?: number;
  product_price_type: string;
  product_currency: string;
  product_unit?: string;
  product_is_active: boolean;
  product_province_name?: string;
  product_department_name?: string;
  product_settlement_name?: string;
  product_seller_name?: string;
  product_views_count: number;
  product_favorites_count: number;
  product_inquiries_count: number;
  product_primary_image_url?: string;
  product_created_at: string;
  // Transport details for transport category products
  transport_price_per_km?: number;
  transport_startup_cost?: number;
}

export interface FavoriteListResponse {
  favorites: FavoriteWithDetails[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private apiUrl = `${environment.apiUrl}/favorites`;

  // Cache for favorited products (productId -> isFavorited)
  private favoritesCache$ = new BehaviorSubject<Map<string, boolean>>(new Map());

  constructor(private http: HttpClient) { }

  /**
   * Toggle favorite status for a product
   */
  toggleFavorite(productId: string): Observable<ToggleFavoriteResponse> {
    return this.http.post<ToggleFavoriteResponse>(`${this.apiUrl}/toggle`, {
      product_id: productId
    }).pipe(
      tap(response => {
        // Update cache
        const cache = this.favoritesCache$.value;
        cache.set(productId, response.is_favorited);
        this.favoritesCache$.next(cache);
      })
    );
  }

  /**
   * Get user's favorited products
   */
  getMyFavorites(page: number = 1, pageSize: number = 20): Observable<FavoriteListResponse> {
    return this.http.get<FavoriteListResponse>(this.apiUrl, {
      params: {
        page: page.toString(),
        page_size: pageSize.toString()
      }
    });
  }

  /**
   * Check which products are favorited (bulk check)
   */
  checkFavorites(productIds: string[]): Observable<CheckFavoritesResponse> {
    if (productIds.length === 0) {
      return new Observable(observer => {
        observer.next({ favorites: {} });
        observer.complete();
      });
    }

    return this.http.post<CheckFavoritesResponse>(`${this.apiUrl}/check`, {
      product_ids: productIds
    }).pipe(
      tap(response => {
        // Update cache
        const cache = this.favoritesCache$.value;
        Object.entries(response.favorites).forEach(([productId, isFavorited]) => {
          cache.set(productId, isFavorited);
        });
        this.favoritesCache$.next(cache);
      })
    );
  }

  /**
   * Check if a single product is favorited (uses cache if available)
   */
  isFavorited(productId: string): boolean {
    return this.favoritesCache$.value.get(productId) || false;
  }

  /**
   * Get favorites cache observable
   */
  getFavoritesCache(): Observable<Map<string, boolean>> {
    return this.favoritesCache$.asObservable();
  }

  /**
   * Clear favorites cache
   */
  clearCache(): void {
    this.favoritesCache$.next(new Map());
  }
}
