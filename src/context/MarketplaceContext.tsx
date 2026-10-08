import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  INITIAL_CATEGORIES,
  INITIAL_SERVICES,
  INITIAL_PROVIDERS,
} from '../services/seedData';
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
  unreadChatCount: number;
  getBookingUnreadChatCount: (bookingId: string) => number;
  isLoading: boolean;
  refreshAll: (force?: boolean) => Promise<void>;
  
  // Bookings
  bookService: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<Booking>;
  changeBookingStatus: (bookingId: string, status: BookingStatus, reason?: string) => Promise<void>;
  respondToOrder: (bookingId: string, action: 'accept' | 'reject', reason?: string) => Promise<void>;
  payBookingWithStripe: (
    bookingId: string,
    stripeDetails: {
      stripePaymentId: string;
      stripeChargeId?: string;
      stripeReceiptUrl?: string;
    }
  ) => Promise<boolean>;
  
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
  
  // User session reset
  clearUserState: () => void;

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

// Concurrency control: prevent burst requests when screens mount or focus simultaneously
let activeRefreshPromise: Promise<void> | null = null;
let lastRefreshTime = 0;
let lastUserKey = '';

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeRole } = useAuth();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [providers, setProviders] = useState<User[]>(INITIAL_PROVIDERS);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearUserState = useCallback(() => {
    setBookings([]);
    setAddresses([]);
    setFavorites([]);
    setNotifications([]);
    setSelectedAddress(null);
  }, []);

  const refreshAll = useCallback(async (force = false) => {
    const now = Date.now();

    // 1. If a refresh is already in-flight, reuse it so we never send redundant parallel bursts
    if (!force && activeRefreshPromise) {
      return activeRefreshPromise;
    }

    const effectiveRole = activeRole || user?.role || 'customer';
    const effectiveUserId = user?.id || (effectiveRole === 'provider' ? 'prov-1' : 'cust-demo');
    const userRoleKey = `${effectiveUserId}_${effectiveRole}`;

    // 2. Throttle calls within 2 seconds for the same user and role unless explicitly forced
    if (!force && lastUserKey === userRoleKey && now - lastRefreshTime < 2000) {
      return;
    }

    lastUserKey = userRoleKey;
    lastRefreshTime = now;
    activeRefreshPromise = (async () => {
      try {
        if (!user && !activeRole) {
          clearUserState();
          const [cats, srvs, provs, revs, cpns] = await Promise.all([
            ServiceAPI.getCategories(),
            ServiceAPI.getServices(),
            ServiceAPI.getProviders(),
            ServiceAPI.getReviews(),
            ServiceAPI.getCoupons(),
          ]);
          setCategories(cats);
          setServices(srvs);
          setProviders(provs);
          setReviews(revs);
          setCoupons(cpns);
          return;
        }

        const [cats, srvs, provs, bks, revs, notifs, addrs, favs, cpns] = await Promise.all([
          ServiceAPI.getCategories(),
          ServiceAPI.getServices(),
          ServiceAPI.getProviders(),
          ServiceAPI.getBookings(effectiveUserId, effectiveRole),
          ServiceAPI.getReviews(),
          ServiceAPI.getNotifications(effectiveUserId),
          ServiceAPI.getAddresses(effectiveUserId),
          ServiceAPI.getFavorites(effectiveUserId),
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

        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0] || null;
        setSelectedAddress(defaultAddr);
      } catch (e) {
        console.info('[Fixora Context] Marketplace data sync notice:', e);
      }
    })().finally(() => {
      activeRefreshPromise = null;
    });

    return activeRefreshPromise;
  }, [user, activeRole, clearUserState]);

  useEffect(() => {
    let isMounted = true;
    let unsubOrders: ServiceAPI.Unsubscribe | null = null;
    let unsubNotifs: ServiceAPI.Unsubscribe | null = null;

    (async () => {
      // 1. Immediately clear old session and let cached data render
      if (!user) {
        clearUserState();
      }

      // Fast initial fetch
      try {
        await refreshAll();
      } catch (e) {
        console.warn('Initial marketplace data notice:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      const effectiveRole = activeRole || user?.role || 'customer';
      const effectiveUserId = user?.id || (effectiveRole === 'provider' ? 'prov-1' : 'cust-demo');

      if (user && isMounted) {
        // Attach live real-time synchronization listener for orders & bookings
        unsubOrders = ServiceAPI.subscribeToOrders(
          effectiveUserId,
          effectiveRole,
          (liveOrders) => {
            if (isMounted) {
              setBookings(liveOrders);
            }
          },
          (err) => {
            console.warn('Real-time orders sync error:', err);
          }
        );

        // Attach live real-time synchronization listener for notifications
        unsubNotifs = ServiceAPI.subscribeToNotifications(
          effectiveUserId,
          (liveNotifs) => {
            if (isMounted) {
              setNotifications((prev) => {
                if (prev.length === liveNotifs.length) {
                  const unchanged = liveNotifs.every(
                    (n, i) => n.id === prev[i]?.id && n.read === prev[i]?.read
                  );
                  if (unchanged) return prev;
                }
                return liveNotifs;
              });
            }
          },
          (err) => {
            console.warn('Real-time notifications sync error:', err);
          }
        );
      }
    })();

    // Cross-tab synchronization on web browsers for multi-tab testing
    let storageListener: ((e: StorageEvent) => void) | null = null;
    if (typeof window !== 'undefined' && window.addEventListener) {
      storageListener = (e: StorageEvent) => {
        if (e.key && e.key.includes('@fixora')) {
          refreshAll();
        }
      };
      window.addEventListener('storage', storageListener);
    }

    // Periodic background sync for notifications & bookings (every 4 seconds) to ensure cross-tab & real-time updates
    const syncPollInterval = setInterval(async () => {
      const effRole = activeRole || user?.role || 'customer';
      const effUserId = user?.id || (effRole === 'provider' ? 'prov-1' : 'cust-demo');
      if (!isMounted || !effUserId) return;
      try {
        const [latestNotifs, latestBookings] = await Promise.all([
          ServiceAPI.getNotifications(effUserId),
          ServiceAPI.getBookings(effUserId, effRole),
        ]);
        if (isMounted && latestNotifs) {
          setNotifications((prev) => {
            if (prev.length === latestNotifs.length) {
              const unchanged = latestNotifs.every(
                (n, i) => n.id === prev[i]?.id && n.read === prev[i]?.read && n.message === prev[i]?.message
              );
              if (unchanged) return prev;
            }
            return latestNotifs;
          });
        }
        if (isMounted && latestBookings) {
          setBookings((prev) => {
            if (prev.length === latestBookings.length) {
              const unchanged = latestBookings.every(
                (b, i) => b.id === prev[i]?.id && b.status === prev[i]?.status && b.updatedAt === prev[i]?.updatedAt
              );
              if (unchanged) return prev;
            }
            return latestBookings;
          });
        }
      } catch {
        // ignore
      }
    }, 4000);

    return () => {
      isMounted = false;
      if (syncPollInterval) {
        clearInterval(syncPollInterval);
      }
      if (unsubOrders) {
        unsubOrders();
      }
      if (unsubNotifs) {
        unsubNotifs();
      }
      if (storageListener && typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('storage', storageListener);
      }
    };
  }, [user, activeRole, clearUserState, refreshAll]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const unreadChatCount = useMemo(() => {
    return notifications.filter((n) => n.type === 'chat' && !n.read).length;
  }, [notifications]);

  const getBookingUnreadChatCount = useCallback(
    (bookingId: string) => {
      if (!bookingId) return 0;
      return notifications.filter(
        (n) =>
          n.type === 'chat' &&
          !n.read &&
          n.bookingId === bookingId
      ).length;
    },
    [notifications]
  );

  const bookService = async (
    data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<Booking> => {
    const effectiveUserId = user?.id || data.userId || 'guest_user';

    const bookingPayload = {
      ...data,
      userId: effectiveUserId,
      customerId: effectiveUserId,
      customerName: user?.name || data.customerName || 'Customer',
      customerEmail: user?.email || data.customerEmail || '',
      customerPhone: user?.phone || data.customerPhone || '',
    };

    const created = await ServiceAPI.createBooking(bookingPayload);
    setBookings((prev) => {
      if (prev.some((b) => b.id === created.id)) return prev;
      return [created, ...prev];
    });

    if (effectiveUserId) {
      ServiceAPI.getNotifications(effectiveUserId)
        .then((notifs) => setNotifications(notifs))
        .catch(() => {});
    }
    return created;
  };

  const changeBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ): Promise<void> => {
    const updated = await ServiceAPI.updateBookingStatus(
      bookingId,
      status,
      reason,
      user?.id,
      user?.role
    );
    if (updated) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ||
          b.orderId === bookingId ||
          (updated.orderId && b.id === updated.orderId)
            ? updated
            : b
        )
      );
      if (user?.id) {
        const notifs = await ServiceAPI.getNotifications(user.id);
        setNotifications(notifs);
      }
    }
  };

  const respondToOrder = async (
    bookingId: string,
    action: 'accept' | 'reject',
    reason?: string
  ): Promise<void> => {
    const updated = await ServiceAPI.respondToOrderRequest(
      bookingId,
      action,
      reason,
      user?.id
    );
    if (updated) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ||
          b.orderId === bookingId ||
          (updated.orderId && b.id === updated.orderId)
            ? updated
            : b
        )
      );
      if (user?.id) {
        const notifs = await ServiceAPI.getNotifications(user.id);
        setNotifications(notifs);
      }
    }
  };

  const payBookingWithStripe = async (
    bookingId: string,
    stripeDetails: {
      stripePaymentId: string;
      stripeChargeId?: string;
      stripeReceiptUrl?: string;
    }
  ): Promise<boolean> => {
    const updated = await ServiceAPI.updateBookingPayment(
      bookingId,
      {
        paymentStatus: 'paid',
        paymentMethod: 'card',
        stripePaymentId: stripeDetails.stripePaymentId,
        stripeChargeId: stripeDetails.stripeChargeId,
        stripeReceiptUrl: stripeDetails.stripeReceiptUrl,
      },
      user?.id
    );
    if (updated) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ||
          b.orderId === bookingId ||
          (updated.orderId && b.id === updated.orderId)
            ? updated
            : b
        )
      );
      if (user?.id) {
        ServiceAPI.getNotifications(user.id)
          .then((notifs) => setNotifications(notifs))
          .catch(() => {});
      }
      return true;
    }
    return false;
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
    if (!user) return false;
    const isNowFav = await ServiceAPI.toggleFavorite(serviceId, user.id);
    setFavorites((prev) =>
      isNowFav ? [...prev, serviceId] : prev.filter((id) => id !== serviceId)
    );
    return isNowFav;
  };

  const isFavorite = (serviceId: string): boolean => {
    return favorites.includes(serviceId);
  };

  const addAddress = async (data: Omit<Address, 'id'>): Promise<Address> => {
    const effectiveUserId = user?.id || 'guest_user';
    const created = await ServiceAPI.addAddress(data, effectiveUserId);
    setAddresses((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
    setSelectedAddress(created);
    return created;
  };

  const removeAddress = async (id: string): Promise<void> => {
    if (!user) return;
    await ServiceAPI.deleteAddress(id, user.id);
    const updatedList = await ServiceAPI.getAddresses(user.id);
    setAddresses(updatedList);
    if (selectedAddress?.id === id) {
      setSelectedAddress(updatedList.find((a) => a.isDefault) || updatedList[0] || null);
    }
  };

  const setDefaultAddress = async (id: string): Promise<void> => {
    if (!user) return;
    await ServiceAPI.setDefaultAddress(id, user.id);
    const updatedList = await ServiceAPI.getAddresses(user.id);
    setAddresses(updatedList);
    const target = updatedList.find((a) => a.id === id);
    if (target) setSelectedAddress(target);
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    await ServiceAPI.markNotificationAsRead(id, user?.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    if (!user) return;
    await ServiceAPI.markAllNotificationsAsRead(user.id);
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
        unreadChatCount,
        getBookingUnreadChatCount,
        isLoading,
        refreshAll,
        clearUserState,
        bookService,
        changeBookingStatus,
        respondToOrder,
        payBookingWithStripe,
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
