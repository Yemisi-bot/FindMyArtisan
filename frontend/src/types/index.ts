// Types for the FindMyArtisan application

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'provider';
  phone?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ServiceProvider {
  id: string;
  business_name: string;
  description: string;
  phone: string;
  address: string;
  profile_image?: string;
  is_verified: boolean;
  is_suspended?: boolean;
  // Postgres returns DECIMAL as a string — always coerce with Number() before math.
  average_rating: number | string;
  review_count: number;
  distance_km?: number;
  distance_meters?: number;
  latitude: number;
  longitude: number;
  category_name: string;
  category_slug: string;
  category_icon: string;
  created_at: string;
  // Admin moderation view (from GET /api/admin/providers)
  provider_name?: string;
  provider_email?: string;
  email_verified?: boolean;
  image_count?: number;
  images_required?: number;
  is_visible?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
}

export interface RatingDistribution {
  rating: number;
  count: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: Pagination;
}

export interface AdminStats {
  totalUsers: number;
  totalProviders: number;
  suspendedProviders: number;
  totalReviews: number;
  totalCategories: number;
  liveProviders: number;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin' | 'provider';
  phone?: string;
  email_verified: boolean;
  has_business: boolean;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string | null;
  admin_name: string;
  actor_role?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkImage {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
}

export interface ContactClick {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  created_at: string;
}

export interface ReviewWithEmail {
  id: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  reviewer_name: string;
  reviewer_email: string;
  created_at: string;
}

export interface ProviderDetails extends ServiceProvider {
  work_images: WorkImage[];
  reviews: ReviewWithEmail[];
  contacts: ContactClick[];
  image_count: number;
  images_required: number;
  is_visible: boolean;
}

export interface Geoposition {
  latitude: number;
  longitude: number;
}
