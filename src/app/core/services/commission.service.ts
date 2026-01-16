import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommissionConfig, CommissionBreakdown, CalculateCommissionRequest } from '@core/models/commission.model';

@Injectable({
  providedIn: 'root'
})
export class CommissionService {
  private apiUrl = `${environment.apiUrl}/products/commissions`;

  constructor(private http: HttpClient) { }

  /**
   * Get commission configuration for a category
   */
  getCommissionConfig(category: string): Observable<CommissionConfig> {
    return this.http.get<CommissionConfig>(`${this.apiUrl}/config`, {
      params: { category }
    });
  }

  /**
   * Calculate commission breakdown for a given price and category
   */
  calculateCommissions(request: CalculateCommissionRequest): Observable<CommissionBreakdown> {
    return this.http.post<CommissionBreakdown>(`${this.apiUrl}/calculate`, request);
  }

  /**
   * Calculate commissions locally (for real-time updates without API call)
   */
  calculateCommissionsLocal(price: number, category: string): CommissionBreakdown {
    const config = this.getCommissionConfigLocal(category);
    
    const buyerCommission = price * (config.buyer_commission_percent / 100);
    const sellerCommission = price * (config.seller_commission_percent / 100);
    const totalCommission = buyerCommission + sellerCommission;

    return {
      base_price: price,
      buyer_commission: buyerCommission,
      seller_commission: sellerCommission,
      total_commission: totalCommission,
      buyer_total: price + buyerCommission,
      seller_net: price - sellerCommission,
      config: config
    };
  }

  /**
   * Get commission configuration locally (without API call)
   */
  private getCommissionConfigLocal(category: string): CommissionConfig {
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
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }
}
