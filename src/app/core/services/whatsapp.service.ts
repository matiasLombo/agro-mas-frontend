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
        product_url?: string;
    }): Observable<WhatsAppLinkResponse> {
        const request: WhatsAppMessageRequest = {
            message_template: messageData
        };

        return this.http.post<WhatsAppLinkResponse>(`${this.apiUrl}/generate-link`, request);
    }

    /**
     * Open WhatsApp in a new tab with the provided URL
     * @param whatsappUrl The WhatsApp URL to open
     */
    openWhatsApp(whatsappUrl: string): void {
        window.open(whatsappUrl, '_blank');
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
        product_url?: string;
    }): Observable<WhatsAppLinkResponse> {
        return this.generateWhatsAppLink(messageData);
    }
}
