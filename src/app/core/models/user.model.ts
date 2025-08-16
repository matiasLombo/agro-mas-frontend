export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cuit?: string;
  businessName?: string;
  businessType?: 'individual' | 'company' | 'cooperative';
  taxCategory?: string;
  province?: string;
  city?: string;
  address?: string;
  role: 'buyer' | 'seller' | 'admin' | 'moderator';
  verificationLevel: number; // 0-4
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  totalSales: number;
  totalPurchases: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'buyer' | 'seller';
  cuit?: string;
  businessName?: string;
  businessType?: 'individual' | 'company' | 'cooperative';
  province?: string;
  city?: string;
  address?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}