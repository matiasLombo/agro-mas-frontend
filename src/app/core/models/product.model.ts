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
    department?: string;
    settlement?: string;
    city?: string;
    province_name?: string;
    department_name?: string;
    settlement_name?: string;
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
    videos?: ProductVideo[];
    // Category-specific details
    transport_details?: TransportDetails;
    livestock_details?: LivestockDetails;
    supplies_details?: SuppliesDetails;
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

export interface ProductVideo {
    id: string;
    product_id: string;
    video_url: string;
    cloud_storage_path?: string;
    thumbnail_url?: string;
    thumbnail_storage_path?: string;
    duration_seconds?: number;
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

// Interfaces for category-specific details
export interface TransportDetails {
    product_id?: string;
    vehicle_type: string;
    capacity_tons?: number;
    capacity_cubic_meters?: number;
    price_per_km?: number;
    has_refrigeration: boolean;
    has_livestock_equipment: boolean;
    service_provinces: string[];
    min_distance_km?: number;
    max_distance_km?: number;
    license_plate?: string;
    license_expiry?: string;
    insurance_expiry?: string;
    vehicle_year?: number;
    created_at?: string;
    updated_at?: string;
}

export interface LivestockDetails {
    product_id?: string;
    animal_type: string;
    breed?: string;
    age_months?: number;
    weight_kg?: number;
    gender?: string;
    health_certificates: string[];
    vaccinations?: VaccinationRecord[];
    last_veterinary_check?: string;
    is_organic: boolean;
    is_pregnant?: boolean;
    breeding_history?: BreedingRecord[];
    genetic_information?: string;
    created_at?: string;
    updated_at?: string;
    is_castrated?: boolean;
    is_weaned?: boolean;
}

export interface SuppliesDetails {
    product_id?: string;
    supply_type: string;
    brand?: string;
    model?: string;
    active_ingredients: string[];
    concentration?: string;
    expiry_date?: string;
    batch_number?: string;
    registration_number?: string;
    required_licenses: string[];
    safety_data_sheet_url?: string;
    storage_requirements?: string;
    handling_instructions?: string;
    disposal_instructions?: string;
    created_at?: string;
    updated_at?: string;
}

// Supporting interfaces
export interface VaccinationRecord {
    vaccine_name: string;
    date_administered: string;
    veterinarian_name?: string;
    batch_number?: string;
    next_due_date?: string;
}

export interface BreedingRecord {
    breeding_date: string;
    partner_breed?: string;
    offspring_count?: number;
    pregnancy_status?: string;
    notes?: string;
}
