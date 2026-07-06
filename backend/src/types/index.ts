import { Request } from 'express';

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'provider';
}

// Authenticated Request
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// User
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'user' | 'admin' | 'provider';
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Service Provider
export interface ServiceProvider {
  id: string;
  userId: string;
  businessName: string;
  categoryId: string;
  description: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  profileImage?: string;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Service Category
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
}

// Review
export interface Review {
  id: string;
  providerId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

// Admin Log
export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Nearby Provider Query
export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radius: number; // in km
  category?: string;
  page?: number;
  limit?: number;
}

// Auth DTOs
export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: 'user' | 'provider';
}

export interface LoginDto {
  email: string;
  password: string;
}

// Provider DTOs
export interface CreateProviderDto {
  businessName: string;
  categoryId: string;
  description: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  profileImage?: string;
}

export interface UpdateProviderDto extends Partial<CreateProviderDto> {
  isVerified?: boolean;
}

// Review DTO
export interface CreateReviewDto {
  providerId: string;
  rating: number;
  comment: string;
}
