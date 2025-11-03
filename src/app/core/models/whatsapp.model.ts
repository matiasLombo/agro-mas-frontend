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
        product_category?: string;
    };
    // Campos para crear purchase_intention en el backend
    product_id?: string;
    seller_id?: string;
    inquiry_type?: string;
    offered_price?: number;
    includes_iva?: boolean;
    is_final_price?: boolean;
    custom_message?: string;
}

export interface WhatsAppLinkResponse {
    whatsapp_url: string;
    deep_link: string;
    web_link: string;
    message: string;
    intention_id?: string;
    intention_created: boolean;
}
