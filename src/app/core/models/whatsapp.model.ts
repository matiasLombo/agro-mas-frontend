export interface WhatsAppMessageRequest {
    message_template: {
        product_title: string;
        product_price: number;
        buyer_name: string;
        offer_price?: number;
        message?: string;
        includes_iva?: boolean;
        is_final_price?: boolean;
        product_url?: string;
    };
}

export interface WhatsAppLinkResponse {
    whatsapp_url: string;
    formatted_phone: string;
    message: string;
}
