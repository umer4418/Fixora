export type UserRole = 'customer' | 'provider' | 'admin';

export type AvailabilityStatus = 'available' | 'busy' | 'offline';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  address?: string;
  bio?: string;
  hourlyRate?: number;
  rating?: number;
  reviewsCount?: number;
  isVerified?: boolean;
  availabilityStatus?: AvailabilityStatus;
  earnings?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Ionicons / MaterialCommunityIcons name
  description: string;
  imageUrl?: string;
  color: string;
  servicesCount?: number;
}

export interface Service {
  id: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  providerRating?: number;
  categoryId: string;
  categoryName: string;
  title: string;
  serviceName?: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: string; // e.g. "1-2 hours"
  imageUrl: string;
  rating: number;
  reviewsCount: number;
  isPopular?: boolean;
  isActive: boolean;
  availability?: 'available' | 'busy' | 'offline' | string;
  features?: string[];
  createdAt: string;
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface OrderItem {
  id?: string;
  serviceId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Booking {
  id: string;
  orderId?: string;
  bookingId?: string;
  userId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerContact?: string;
  customerEmail?: string;
  providerId: string;
  providerName: string;
  providerEmail?: string;
  providerAvatar?: string;
  providerPhone?: string;
  serviceId: string;
  serviceTitle: string;
  serviceName?: string;
  categoryName: string;
  serviceImage?: string;
  items?: OrderItem[];
  quantity?: number;
  price?: number;
  totalPrice: number;
  totalAmount?: number;
  date: string; // YYYY-MM-DD
  bookingDate?: string;
  timeSlot: string; // e.g. "10:00 AM - 12:00 PM"
  bookingTime?: string;
  address: Address;
  notes?: string;
  status: BookingStatus;
  bookingStatus?: string;
  orderStatus?: string; // e.g. "Pending Provider Acceptance" | "Accepted" | "In Progress" | "Completed" | "Cancelled" | "Rejected"
  providerStatus?: 'Pending' | 'Accepted' | 'Rejected' | string;
  paymentStatus: 'unpaid' | 'paid' | 'Pending' | 'Paid' | string;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'Cash on Delivery' | string;
  couponCode?: string;
  discountAmount?: number;
  createdAt: string;
  updatedAt: string;
  cancellationReason?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  orderId?: string;
  chatId?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  message?: string;
  timestamp: string;
  createdAt?: string;
  isRead: boolean;
  read?: boolean;
}

export interface Review {
  id: string;
  bookingId?: string;
  serviceId: string;
  serviceTitle?: string;
  providerId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'chat' | 'promo' | 'system';
  read: boolean;
  createdAt: string;
  bookingId?: string;
}

export interface Address {
  id: string;
  userId?: string;
  label: 'Home' | 'Work' | 'Other';
  street: string;
  apartment?: string;
  city: string;
  state?: string;
  zipCode?: string;
  isDefault?: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number; // e.g. 20 for 20%
  discountAmount?: number; // e.g. 15 for fixed $15
  minOrderAmount: number;
  description: string;
  expiryDate: string; // YYYY-MM-DD
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}
