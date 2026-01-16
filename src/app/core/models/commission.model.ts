export interface CommissionConfig {
  buyer_commission_percent: number;
  seller_commission_percent: number;
  total_commission_percent: number;
  description: string;
}

export interface CommissionBreakdown {
  base_price: number;
  buyer_commission: number;
  seller_commission: number;
  total_commission: number;
  buyer_total: number;        // What buyer pays
  seller_net: number;          // What seller receives
  config: CommissionConfig;
}

export interface CalculateCommissionRequest {
  price: number;
  category: string;
}
