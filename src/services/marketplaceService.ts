import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import {
  Category,
  Service,
  User,
  Booking,
  BookingStatus,
  Review,
  AppNotification,
  Address,
  ChatMessage,
  Coupon,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_SERVICES,
  INITIAL_PROVIDERS,
  INITIAL_BOOKINGS,
  INITIAL_REVIEWS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ADDRESSES,
  INITIAL_CHAT_MESSAGES,
  INITIAL_COUPONS,
} from './seedData';

// Storage keys for local persistence fallback
const KEYS = {
  CATEGORIES: '@fixora_categories',
  SERVICES: '@fixora_services',
  PROVIDERS: '@fixora_providers',
  BOOKINGS: '@fixora_bookings',
  REVIEWS: '@fixora_reviews',
  NOTIFICATIONS: '@fixora_notifications',
  ADDRESSES: '@fixora_addresses',
  FAVORITES: '@fixora_favorites',
  CHATS: '@fixora_chats',
  COUPONS: '@fixora_coupons',
};

// Helper: load from AsyncStorage with initial seed
async function getStoredOrSeed<T>(key: string, seed: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.warn(`Error reading ${key}:`, err);
  }
  // save initial seed
  await AsyncStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

async function saveStored<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error saving ${key}:`, err);
  }
}

// ======================== CATEGORIES ========================
export async function getCategories(): Promise<Category[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
      }
    } catch (e) {
      console.warn('Firestore getCategories failed, using fallback', e);
    }
  }
  return getStoredOrSeed(KEYS.CATEGORIES, INITIAL_CATEGORIES);
}

export async function addCategory(category: Omit<Category, 'id'>): Promise<Category> {
  const newCat: Category = {
    ...category,
    id: `cat-${Date.now()}`,
    servicesCount: 0,
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'categories', newCat.id), newCat);
    } catch (e) {
      console.warn('Firestore addCategory failed', e);
    }
  }

  const existing = await getCategories();
  const updated = [newCat, ...existing];
  await saveStored(KEYS.CATEGORIES, updated);
  return newCat;
}

export async function updateCategory(catId: string, updates: Partial<Category>): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'categories', catId), updates);
    } catch (e) {
      console.warn('Firestore updateCategory failed', e);
    }
  }
  const existing = await getCategories();
  const updated = existing.map((c) => (c.id === catId ? { ...c, ...updates } : c));
  await saveStored(KEYS.CATEGORIES, updated);
}

export async function deleteCategory(catId: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'categories', catId));
    } catch (e) {
      console.warn('Firestore deleteCategory failed', e);
    }
  }
  const existing = await getCategories();
  const updated = existing.filter((c) => c.id !== catId);
  await saveStored(KEYS.CATEGORIES, updated);
}

// ======================== SERVICES ========================
export async function getServices(): Promise<Service[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'services'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service);
      }
    } catch (e) {
      console.warn('Firestore getServices fallback', e);
    }
  }
  return getStoredOrSeed(KEYS.SERVICES, INITIAL_SERVICES);
}

export async function getServiceById(id: string): Promise<Service | undefined> {
  const services = await getServices();
  return services.find((s) => s.id === id);
}

export async function getServicesByProvider(providerId: string): Promise<Service[]> {
  const services = await getServices();
  return services.filter((s) => s.providerId === providerId);
}

export async function addService(service: Omit<Service, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>): Promise<Service> {
  const newService: Service = {
    ...service,
    id: `srv-${Date.now()}`,
    rating: 5.0,
    reviewsCount: 0,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'services', newService.id), newService);
    } catch (e) {
      console.warn('Firestore addService fallback', e);
    }
  }

  const existing = await getServices();
  const updated = [newService, ...existing];
  await saveStored(KEYS.SERVICES, updated);
  return newService;
}

export async function updateService(id: string, updates: Partial<Service>): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'services', id), updates);
    } catch (e) {
      console.warn('Firestore updateService fallback', e);
    }
  }
  const existing = await getServices();
  const updated = existing.map((s) => (s.id === id ? { ...s, ...updates } : s));
  await saveStored(KEYS.SERVICES, updated);
}

export async function deleteService(id: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (e) {
      console.warn('Firestore deleteService fallback', e);
    }
  }
  const existing = await getServices();
  const updated = existing.filter((s) => s.id !== id);
  await saveStored(KEYS.SERVICES, updated);
}

// ======================== PROVIDERS ========================
export async function getProviders(): Promise<User[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'provider'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
      }
    } catch (e) {
      console.warn('Firestore getProviders fallback', e);
    }
  }
  return getStoredOrSeed(KEYS.PROVIDERS, INITIAL_PROVIDERS);
}

export async function getProviderById(id: string): Promise<User | undefined> {
  const providers = await getProviders();
  return providers.find((p) => p.id === id);
}

export async function updateProviderStatus(
  providerId: string,
  status: 'available' | 'busy' | 'offline'
): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'users', providerId), { availabilityStatus: status });
    } catch (e) {
      console.warn('Firestore updateProviderStatus fallback', e);
    }
  }
  const existing = await getProviders();
  const updated = existing.map((p) =>
    p.id === providerId ? { ...p, availabilityStatus: status } : p
  );
  await saveStored(KEYS.PROVIDERS, updated);
}

export async function toggleProviderVerification(
  providerId: string,
  isVerified: boolean
): Promise<void> {
  const existing = await getProviders();
  const updated = existing.map((p) =>
    p.id === providerId ? { ...p, isVerified } : p
  );
  await saveStored(KEYS.PROVIDERS, updated);
}

// ======================== BOOKINGS ========================
export async function getBookings(): Promise<Booking[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'bookings'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking);
      }
    } catch (e) {
      console.warn('Firestore getBookings fallback', e);
    }
  }
  return getStoredOrSeed(KEYS.BOOKINGS, INITIAL_BOOKINGS);
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const bookings = await getBookings();
  return bookings.find((b) => b.id === id);
}

export async function createBooking(
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<Booking> {
  const newBooking: Booking = {
    ...bookingData,
    id: `book-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'bookings', newBooking.id), newBooking);
    } catch (e) {
      console.warn('Firestore createBooking fallback', e);
    }
  }

  const existing = await getBookings();
  const updated = [newBooking, ...existing];
  await saveStored(KEYS.BOOKINGS, updated);

  // Trigger automated notification to provider and customer
  await addNotification({
    userId: newBooking.providerId,
    title: 'New Booking Request! 📅',
    message: `${newBooking.customerName} requested ${newBooking.serviceTitle} on ${newBooking.date} (${newBooking.timeSlot}).`,
    type: 'booking',
    read: false,
    bookingId: newBooking.id,
  });

  return newBooking;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string
): Promise<Booking | null> {
  const existing = await getBookings();
  const target = existing.find((b) => b.id === bookingId);
  if (!target) return null;

  const updatedBooking: Booking = {
    ...target,
    status,
    updatedAt: new Date().toISOString(),
    ...(reason ? { cancellationReason: reason } : {}),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: updatedBooking.updatedAt,
        ...(reason ? { cancellationReason: reason } : {}),
      });
    } catch (e) {
      console.warn('Firestore updateBookingStatus fallback', e);
    }
  }

  const updatedList = existing.map((b) => (b.id === bookingId ? updatedBooking : b));
  await saveStored(KEYS.BOOKINGS, updatedList);

  // Send status update notification to customer
  const statusTitles: Record<BookingStatus, string> = {
    pending: 'Booking is Pending',
    accepted: 'Booking Accepted! 🤝',
    on_the_way: 'Provider is On The Way! 🚗',
    in_progress: 'Service In Progress 🧰',
    completed: 'Service Completed! ⭐',
    cancelled: 'Booking Cancelled ❌',
  };

  await addNotification({
    userId: target.customerId,
    title: statusTitles[status],
    message: `Your booking for ${target.serviceTitle} is now marked as ${status.replace(/_/g, ' ')}.`,
    type: 'booking',
    read: false,
    bookingId: target.id,
  });

  return updatedBooking;
}

// ======================== REVIEWS ========================
export async function getReviews(): Promise<Review[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'reviews'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
      }
    } catch (e) {
      console.warn('Firestore getReviews fallback', e);
    }
  }
  return getStoredOrSeed(KEYS.REVIEWS, INITIAL_REVIEWS);
}

export async function getReviewsForService(serviceId: string): Promise<Review[]> {
  const reviews = await getReviews();
  return reviews.filter((r) => r.serviceId === serviceId);
}

export async function getReviewsForProvider(providerId: string): Promise<Review[]> {
  const reviews = await getReviews();
  return reviews.filter((r) => r.providerId === providerId);
}

export async function addReview(
  reviewData: Omit<Review, 'id' | 'createdAt'>
): Promise<Review> {
  const newReview: Review = {
    ...reviewData,
    id: `rev-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'reviews', newReview.id), newReview);
    } catch (e) {
      console.warn('Firestore addReview fallback', e);
    }
  }

  const existing = await getReviews();
  const updated = [newReview, ...existing];
  await saveStored(KEYS.REVIEWS, updated);

  // Recalculate service rating
  const serviceReviews = updated.filter((r) => r.serviceId === newReview.serviceId);
  const avg =
    serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length;
  await updateService(newReview.serviceId, {
    rating: parseFloat(avg.toFixed(1)),
    reviewsCount: serviceReviews.length,
  });

  return newReview;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const existing = await getReviews();
  const updated = existing.filter((r) => r.id !== reviewId);
  await saveStored(KEYS.REVIEWS, updated);
}

// ======================== CHAT MESSAGES ========================
export async function getChatMessages(bookingId: string): Promise<ChatMessage[]> {
  const chatsMap = await getStoredOrSeed<Record<string, ChatMessage[]>>(
    KEYS.CHATS,
    INITIAL_CHAT_MESSAGES
  );
  return chatsMap[bookingId] || [];
}

export async function sendChatMessage(
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'>
): Promise<ChatMessage> {
  const newMsg: ChatMessage = {
    ...messageData,
    id: `msg-${Date.now()}`,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  const chatsMap = await getStoredOrSeed<Record<string, ChatMessage[]>>(
    KEYS.CHATS,
    INITIAL_CHAT_MESSAGES
  );
  const currentThread = chatsMap[newMsg.bookingId] || [];
  const updatedThread = [...currentThread, newMsg];
  chatsMap[newMsg.bookingId] = updatedThread;

  await saveStored(KEYS.CHATS, chatsMap);

  // Send notification to recipient
  await addNotification({
    userId: newMsg.recipientId,
    title: `Message from ${newMsg.senderName}`,
    message: newMsg.text,
    type: 'chat',
    read: false,
    bookingId: newMsg.bookingId,
  });

  return newMsg;
}

// ======================== NOTIFICATIONS ========================
export async function getNotifications(userId?: string): Promise<AppNotification[]> {
  const list = await getStoredOrSeed(KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  if (!userId) return list;
  return list.filter((n) => n.userId === userId || n.userId === 'cust-demo');
}

export async function addNotification(
  notifData: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    ...notifData,
    id: `notif-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const existing = await getNotifications();
  const updated = [newNotif, ...existing];
  await saveStored(KEYS.NOTIFICATIONS, updated);
  return newNotif;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const existing = await getNotifications();
  const updated = existing.map((n) => (n.id === id ? { ...n, read: true } : n));
  await saveStored(KEYS.NOTIFICATIONS, updated);
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  const existing = await getNotifications();
  const updated = existing.map((n) =>
    !userId || n.userId === userId ? { ...n, read: true } : n
  );
  await saveStored(KEYS.NOTIFICATIONS, updated);
}

// ======================== ADDRESSES ========================
export async function getAddresses(): Promise<Address[]> {
  return getStoredOrSeed(KEYS.ADDRESSES, INITIAL_ADDRESSES);
}

export async function addAddress(addressData: Omit<Address, 'id'>): Promise<Address> {
  const newAddr: Address = {
    ...addressData,
    id: `addr-${Date.now()}`,
  };
  const existing = await getAddresses();
  let updated = existing;
  if (newAddr.isDefault) {
    updated = existing.map((a) => ({ ...a, isDefault: false }));
  }
  updated = [newAddr, ...updated];
  await saveStored(KEYS.ADDRESSES, updated);
  return newAddr;
}

export async function setDefaultAddress(id: string): Promise<void> {
  const existing = await getAddresses();
  const updated = existing.map((a) => ({
    ...a,
    isDefault: a.id === id,
  }));
  await saveStored(KEYS.ADDRESSES, updated);
}

export async function deleteAddress(id: string): Promise<void> {
  const existing = await getAddresses();
  const updated = existing.filter((a) => a.id !== id);
  await saveStored(KEYS.ADDRESSES, updated);
}

// ======================== FAVORITES ========================
export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FAVORITES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading favorites', e);
  }
  return ['srv-clean-deep', 'srv-ac-servicing'];
}

export async function toggleFavorite(serviceId: string): Promise<boolean> {
  const favorites = await getFavorites();
  let updated: string[];
  let isFav = false;
  if (favorites.includes(serviceId)) {
    updated = favorites.filter((id) => id !== serviceId);
    isFav = false;
  } else {
    updated = [...favorites, serviceId];
    isFav = true;
  }
  await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
  return isFav;
}

// ======================== COUPONS ========================
export async function getCoupons(): Promise<Coupon[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon);
      }
    } catch (e) {
      console.warn('Firestore getCoupons fallback', e);
    }
  }
  return getStoredOrSeed(KEYS.COUPONS, INITIAL_COUPONS);
}

export async function addCoupon(
  coupon: Omit<Coupon, 'id' | 'usageCount' | 'createdAt'>
): Promise<Coupon> {
  const newCoupon: Coupon = {
    ...coupon,
    id: `cpn-${Date.now()}`,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'coupons', newCoupon.id), newCoupon);
    } catch (e) {
      console.warn('Firestore addCoupon fallback', e);
    }
  }

  const existing = await getCoupons();
  const updated = [newCoupon, ...existing];
  await saveStored(KEYS.COUPONS, updated);
  return newCoupon;
}

export async function deleteCoupon(id: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (e) {
      console.warn('Firestore deleteCoupon fallback', e);
    }
  }
  const existing = await getCoupons();
  const updated = existing.filter((c) => c.id !== id);
  await saveStored(KEYS.COUPONS, updated);
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<{ valid: boolean; discount: number; message: string; coupon?: Coupon }> {
  const coupons = await getCoupons();
  const found = coupons.find(
    (c) => c.code.trim().toUpperCase() === code.trim().toUpperCase() && c.isActive
  );

  if (!found) {
    return { valid: false, discount: 0, message: 'Invalid or inactive coupon code' };
  }

  if (subtotal < found.minOrderAmount) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order amount of $${found.minOrderAmount} required for this coupon`,
    };
  }

  let discount = Math.round((subtotal * found.discountPercent) / 100);
  if (found.discountAmount && found.discountAmount > discount) {
    discount = found.discountAmount;
  }
  if (discount > subtotal) {
    discount = subtotal;
  }

  return {
    valid: true,
    discount,
    message: `Coupon ${found.code} applied! (-$${discount})`,
    coupon: found,
  };
}

