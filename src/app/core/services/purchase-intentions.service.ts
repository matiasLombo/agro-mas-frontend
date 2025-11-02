import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PurchaseIntention {
    id: string;
    product_id: string;
    seller_id: string;
    inquiry_type: string;
    offered_price?: number;
    includes_iva: boolean;
    is_final_price: boolean;
    custom_message?: string;
    status: string;
    whatsapp_link_clicked_at?: string;
    created_at: string;
    updated_at: string;

    // Product details (from JOIN)
    product_title?: string;
    product_category?: string;
    product_price?: number;
    seller_name?: string;
}

export interface PurchaseIntentionsResponse {
    intentions: PurchaseIntention[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface PurchaseIntentionStats {
    total_intentions: number;
    by_status: { [key: string]: number };
    by_inquiry_type: { [key: string]: number };
    total_offered_value: number;
    average_offered_price: number;
}

@Injectable({
    providedIn: 'root'
})
export class PurchaseIntentionsService {
    private apiUrl = `${environment.apiUrl}/purchase-intentions`;

    constructor(private http: HttpClient) { }

    /**
     * Get my purchases (buyer's purchase intentions)
     */
    getMyPurchases(page: number = 1, pageSize: number = 10, status?: string): Observable<PurchaseIntentionsResponse> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('page_size', pageSize.toString());

        if (status) {
            params = params.set('status', status);
        }

        return this.http.get<PurchaseIntentionsResponse>(`${this.apiUrl}/my-purchases`, { params });
    }

    /**
     * Get my inquiries (seller's received inquiries)
     */
    getMyInquiries(page: number = 1, pageSize: number = 10, status?: string): Observable<PurchaseIntentionsResponse> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('page_size', pageSize.toString());

        if (status) {
            params = params.set('status', status);
        }

        return this.http.get<PurchaseIntentionsResponse>(`${this.apiUrl}/my-inquiries`, { params });
    }

    /**
     * Get a specific purchase intention by ID
     */
    getIntentionById(id: string): Observable<{ intention: PurchaseIntention }> {
        return this.http.get<{ intention: PurchaseIntention }>(`${this.apiUrl}/${id}`);
    }

    /**
     * Get my purchase statistics
     */
    getMyStats(): Observable<PurchaseIntentionStats> {
        return this.http.get<PurchaseIntentionStats>(`${this.apiUrl}/my-stats`);
    }

    /**
     * Get seller inquiry statistics
     */
    getSellerStats(): Observable<PurchaseIntentionStats> {
        return this.http.get<PurchaseIntentionStats>(`${this.apiUrl}/seller-stats`);
    }

    /**
     * Cancel a purchase intention
     */
    cancelIntention(id: string, reason: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/cancel`, {
            cancellation_reason: reason
        });
    }

    /**
     * Update intention status (buyer self-tracking)
     */
    updateIntentionStatus(id: string, status: string): Observable<{ message: string; status: string }> {
        return this.http.patch<{ message: string; status: string }>(`${this.apiUrl}/${id}/status`, {
            status: status
        });
    }

    /**
     * Update a purchase intention
     */
    updateIntention(id: string, updates: Partial<PurchaseIntention>): Observable<{ message: string }> {
        return this.http.patch<{ message: string }>(`${this.apiUrl}/${id}`, updates);
    }
}
