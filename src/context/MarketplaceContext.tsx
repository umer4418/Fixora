import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Category,
  Service,
  User,
  Booking,
  BookingStatus,
  Review,
  AppNotification,
  Address,
  Coupon,
} from '../types';
import * as ServiceAPI from '../services/marketplaceService';
import { useAuth } from './AuthContext';

interface MarketplaceContextType {
  categories: Category[];
  services: Service[];
  providers: User[];
  bookings: Booking[];
  reviews: Review[];
  notifications: AppNotification[];
  addresses: Address[];
  favorites: string[];
  coupons: Coupon[];
  selectedAddress: Address | null;
  unreadNotificationsCount: number;
  isLoading: boolean;
  refreshAll: () => Promise<void>;
  
  // Bookings
  bookService: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<Booking>;
  changeBookingStatus: (bookingId: string, status: BookingStatus, reason?: string) => Promise<void>;
  
  // Reviews
  createReview: (data: Omit<Review, 'id' | 'createdAt'>) => Promise<Review>;
  removeReview: (id: string) => Promise<void>;
  
  // Favorites
  toggleFavorite: (serviceId: string) => Promise<boolean>;
  isFavorite: (serviceId: string) => boolean;
  
  // Addresses
  addAddress: (data: Omit<Address, 'id'>) => Promise<Address>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  setSelectedAddress: (address: Address | null) => void;
  
  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Coupons
  createCoupon: (data: Omit<Coupon, 'id' | 'usageCount' | 'createdAt'>) => Promise<Coupon>;
  removeCoupon: (id: string) => Promise<void>;
  applyCouponCode: (code: string, subtotal: number) => Promise<{ valid: boolean; discount: number; message: string; coupon?: Coupon }>;
  
  // Provider / Admin operations
  createService: (data: Omit<Service, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>) => Promise<Service>;
  editService: (id: string, updates: Partial<Service>) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  createCategory: (data: Omit<Category, 'id'>) => Promise<Category>;
  editCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  setProviderAvailability: (status: 'available' | 'busy' | 'offline') => Promise<void>;
  verifyProvider: (providerId: string, isVerified: boolean) => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAll = useCallback(async () => {
    try {
      const [cats, srvs, provs, bks, revs, notifs, addrs, favs, cpns] = await Promise.all([
        ServiceAPI.getCategories(),
        ServiceAPI.getServices(),
        ServiceAPI.getProviders(),
        ServiceAPI.getBookings(),
        ServiceAPI.getReviews(),
        ServiceAPI.getNotifications(user?.id),
        ServiceAPI.getAddresses(),
        ServiceAPI.getFavorites(),
        ServiceAPI.getCoupons(),
      ]);

      setCategories(cats);
      setServices(srvs);
      setProviders(provs);
      setBookings(bks);
      setReviews(revs);
      setNotifications(notifs);
      setAddresses(addrs);
      setFavorites(favs);
      setCoupons(cpns);
    } catch (e) {
      console.warn('Failed loading marketplace data', e);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [cats, srvs, provs, bks, revs, notifs, addrs, favs, cpns] = await Promise.all([
          ServiceAPI.getCategories(),
          ServiceAPI.getServices(),
          ServiceAPI.getProviders(),
          ServiceAPI.getBookings(),
          ServiceAPI.getReviews(),
          ServiceAPI.getNotifications(user?.id),
          ServiceAPI.getAddresses(),
          ServiceAPI.getFavorites(),
          ServiceAPI.getCoupons(),
        ]);

        if (!isMounted) return;
        setCategories(cats);
        setServices(srvs);
        setProviders(provs);
        setBookings(bks);
        setReviews(revs);
        setNotifications(notifs);
        setAddresses(addrs);
        setFavorites(favs);
        setCoupons(cpns);

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0] || null;
        setSelectedAddress(defaultAddr);
      } catch (e) {
        console.warn('Failed loading marketplace data', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const bookService = async (
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<Booking> => {
    const created = await ServiceAPI.createBooking(data);
    setBookings((prev) => [created, ...prev]);
    // update notifications
    const notifs = await ServiceAPI.getNotifications(user?.id);
    setNotifications(notifs);
    return created;
  };

  const changeBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ): Promise<void> => {
    const updated = await ServiceAPI.updateBookingStatus(bookingId, status, reason);
    if (updated) {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      const notifs = await ServiceAPI.getNotifications(user?.id);
      setNotifications(notifs);
    }
  };

  const createReview = async (
    data: Omit<Review, 'id' | 'createdAt'>
  ): Promise<Review> => {
    const created = await ServiceAPI.addReview(data);
    setReviews((prev) => [created, ...prev]);
    // refresh services so ratings update
    const srvs = await ServiceAPI.getServices();
    setServices(srvs);
    return created;
  };

  const removeReview = async (id: string): Promise<void> => {
    await ServiceAPI.deleteReview(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleFavorite = async (serviceId: string): Promise<boolean> => {
    const isNowFav = await ServiceAPI.toggleFavorite(serviceId);
    setFavorites((prev) =>
      isNowFav ? [...prev, serviceId] : prev.filter((id) => id !== serviceId)
    );
    return isNowFav;
  };

  const isFavorite = (serviceId: string): boolean => {
    return favorites.includes(serviceId);
  };

  const addAddress = async (data: Omit<Address, 'id'>): Promise<Address> => {
    const created = await ServiceAPI.addAddress(data);
    const updatedList = await ServiceAPI.getAddresses();
    setAddresses(updatedList);
    if (created.isDefault || !selectedAddress) {
      setSelectedAddress(created);
    }
    return created;
  };

  const removeAddress = async (id: string): Promise<void> => {
    await ServiceAPI.deleteAddress(id);
    const updatedList = await ServiceAPI.getAddresses();
    setAddresses(updatedList);
    if (selectedAddress?.id === id) {
      setSelectedAddress(updatedList[0] || null);
    }
  };

  const setDefaultAddress = async (id: string): Promise<void> => {
    await ServiceAPI.setDefaultAddress(id);
    const updatedList = await ServiceAPI.getAddresses();
    setAddresses(updatedList);
    const target = updatedList.find((a) => a.id === id);
    if (target) setSelectedAddress(target);
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    await ServiceAPI.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    await ServiceAPI.markAllNotificationsAsRead(user?.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const createService = async (
    data: Omit<Service, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>
  ): Promise<Service> => {
    const srv = await ServiceAPI.addService(data);
    setServices((prev) => [srv, ...prev]);
    return srv;
  };

  const editService = async (id: string, updates: Partial<Service>): Promise<void> => {
    await ServiceAPI.updateService(id, updates);
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeService = async (id: string): Promise<void> => {
    await ServiceAPI.deleteService(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const createCategory = async (data: Omit<Category, 'id'>): Promise<Category> => {
    const cat = await ServiceAPI.addCategory(data);
    setCategories((prev) => [cat, ...prev]);
    return cat;
  };

  const editCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    await ServiceAPI.updateCategory(id, updates);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCategory = async (id: string): Promise<void> => {
    await ServiceAPI.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const setProviderAvailability = async (
    status: 'available' | 'busy' | 'offline'
  ): Promise<void> => {
    if (!user) return;
    await ServiceAPI.updateProviderStatus(user.id, status);
    setProviders((prev) =>
      prev.map((p) => (p.id === user.id ? { ...p, availabilityStatus: status } : p))
    );
  };

  const verifyProvider = async (
    providerId: string,
    isVerified: boolean
  ): Promise<void> => {
    await ServiceAPI.toggleProviderVerification(providerId, isVerified);
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, isVerified } : p))
    );
  };

  const createCoupon = async (
    data: Omit<Coupon, 'id' | 'usageCount' | 'createdAt'>
  ): Promise<Coupon> => {
    const coupon = await ServiceAPI.addCoupon(data);
    setCoupons((prev) => [coupon, ...prev]);
    return coupon;
  };

  const removeCoupon = async (id: string): Promise<void> => {
    await ServiceAPI.deleteCoupon(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const applyCouponCode = async (
    code: string,
    subtotal: number
  ): Promise<{ valid: boolean; discount: number; message: string; coupon?: Coupon }> => {
    return ServiceAPI.validateCoupon(code, subtotal);
  };

  return (
    <MarketplaceContext.Provider
      value={{
        categories,
        services,
        providers,
        bookings,
        reviews,
        notifications,
        addresses,
        favorites,
        coupons,
        selectedAddress,
        unreadNotificationsCount,
        isLoading,
        refreshAll,
        bookService,
        changeBookingStatus,
        createReview,
        removeReview,
        toggleFavorite,
        isFavorite,
        addAddress,
        removeAddress,
        setDefaultAddress,
        setSelectedAddress,
        markNotificationRead,
        markAllNotificationsRead,
        createCoupon,
        removeCoupon,
        applyCouponCode,
        createService,
        editService,
        removeService,
        createCategory,
        editCategory,
        removeCategory,
        setProviderAvailability,
        verifyProvider,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};
