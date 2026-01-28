import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WhatsAppMessageRequest, WhatsAppLinkResponse } from '../models/whatsapp.model';

@Injectable({
    providedIn: 'root'
})
export class WhatsAppService {
    private apiUrl = `${environment.apiUrl}/whatsapp`;

    constructor(private http: HttpClient) { }

    /**
     * Generate a WhatsApp link for contacting the seller
     * @param messageData Message template data
     * @returns Observable with WhatsApp URL
     */
    generateWhatsAppLink(messageData: {
        product_title: string;
        product_price: number;
        buyer_name: string;
        offer_price?: number;
        message?: string;
        includes_iva?: boolean;
        is_final_price?: boolean;
        product_url?: string;
        product_category?: string;
        product_id?: string;
        seller_id?: string;
        inquiry_type?: string;
    }): Observable<WhatsAppLinkResponse> {
        const request: WhatsAppMessageRequest = {
            message_template: {
                product_title: messageData.product_title,
                product_price: messageData.product_price,
                buyer_name: messageData.buyer_name,
                offer_price: messageData.offer_price,
                message: messageData.message,
                includes_iva: messageData.includes_iva,
                is_final_price: messageData.is_final_price,
                product_url: messageData.product_url,
                product_category: messageData.product_category
            },
            // Campos para crear purchase_intention
            product_id: messageData.product_id,
            seller_id: messageData.seller_id,
            inquiry_type: messageData.inquiry_type || 'price',
            offered_price: messageData.offer_price,
            includes_iva: messageData.includes_iva || false,
            is_final_price: messageData.is_final_price || false,
            custom_message: messageData.message
        };

        return this.http.post<WhatsAppLinkResponse>(`${this.apiUrl}/generate-link`, request);
    }

    /**
     * Open a blank window synchronously (must be called within a user gesture).
     * Returns the window reference so the URL can be set after an async operation.
     * On iOS Safari, returns null and falls back to location.href in openWhatsApp.
     */
    prepareWindow(): Window | null {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            return null;
        }
        return window.open('', '_blank');
    }

    /**
     * Open WhatsApp using a pre-opened window reference or fallback navigation.
     * @param whatsappUrl The WhatsApp URL to open
     * @param preOpenedWindow Optional window reference from prepareWindow()
     */
    openWhatsApp(whatsappUrl: string, preOpenedWindow?: Window | null): void {
        if (preOpenedWindow) {
            preOpenedWindow.location.href = whatsappUrl;
        } else {
            window.location.href = whatsappUrl;
        }
    }

    /**
     * Contact seller via WhatsApp (combines generate link and open)
     * @param messageData Message template data
     * @returns Observable with WhatsApp link response
     */
    contactSeller(messageData: {
        product_title: string;
        product_price: number;
        buyer_name: string;
        offer_price?: number;
        message?: string;
        includes_iva?: boolean;
        is_final_price?: boolean;
        product_url?: string;
        product_category?: string;
        product_id?: string;
        seller_id?: string;
        inquiry_type?: string;
    }): Observable<WhatsAppLinkResponse> {
        return this.generateWhatsAppLink(messageData);
    }
}
