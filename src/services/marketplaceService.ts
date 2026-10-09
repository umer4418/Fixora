import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    Unsubscribe,
    updateDoc,
    where,
} from 'firebase/firestore';
import {
    Address,
    AppNotification,
    Booking,
    BookingStatus,
    Category,
    ChatMessage,
    Coupon,
    Review,
    Service,
    User,
    UserRole,
} from '../types';
import { db, isFirebaseConfigured } from './firebaseConfig';
import {
    INITIAL_ADDRESSES,
    INITIAL_BOOKINGS,
    INITIAL_CATEGORIES,
    INITIAL_CHAT_MESSAGES,
    INITIAL_COUPONS,
    INITIAL_NOTIFICATIONS,
    INITIAL_PROVIDERS,
    INITIAL_REVIEWS,
    INITIAL_SERVICES,
} from './seedData';

export type { Unsubscribe };

// Storage keys for local persistence fallback
const KEYS = {
  CATEGORIES: '@fixora_categories',
  SERVICES: '@fixora_services',
  PROVIDERS: '@fixora_providers',
  ORDERS: '@fixora_orders',
  BOOKINGS: '@fixora_bookings',
  REVIEWS: '@fixora_reviews',
  NOTIFICATIONS: '@fixora_notifications',
  ADDRESSES: '@fixora_addresses',
  FAVORITES: '@fixora_favorites',
  CHATS: '@fixora_chats',
  COUPONS: '@fixora_coupons',
};

// User-specific storage key generator
export function getUserStorageKey(baseKey: string, userId?: string): string {
  if (!userId) return `${baseKey}_guest`;
  return `${baseKey}_user_${userId}`;
}

async function getStoredList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch (err) {
    console.warn(`Error reading ${key}:`, err);
  }
  return [];
}

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

// Firestore operation timeout guard to guarantee non-blocking queries (defaults to 4500ms)
export function withTimeout<T>(promise: Promise<T>, timeoutMs = 4500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Firestore request timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

function logFallback(opName: string, err: unknown) {
  if (__DEV__) {
    const msg = err instanceof Error ? err.message : String(err);
    console.info(`[Fixora Offline Cache] ${opName}: using local storage (${msg})`);
  }
}

/** Firestore rejects `undefined` field values. Strip them before setDoc/updateDoc. */
function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object Object]'
  ) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = omitUndefinedDeep(val);
      }
    }
    return result as T;
  }
  return value;
}

// ======================== CATEGORIES ========================
export async function getCategories(): Promise<Category[]> {
  const firestoreDb = db;
  if (isFirebaseConfigured() && firestoreDb) {
    try {
      const snap = await withTimeout(getDocs(collection(firestoreDb, 'categories')));
      if (!snap.empty) {
        const firestoreCats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
        const existingCatIds = new Set(firestoreCats.map((c) => c.id));
        const missingCats = INITIAL_CATEGORIES.filter((c) => !existingCatIds.has(c.id));
        if (missingCats.length > 0) {
          missingCats.forEach((c) => {
            setDoc(doc(firestoreDb, 'categories', c.id), c, { merge: true }).catch(() => {});
          });
        }
        const allCats = [...firestoreCats, ...missingCats];
        await saveStored(KEYS.CATEGORIES, allCats);
        return allCats;
      }
    } catch (e) {
      logFallback('getCategories', e);
    }
  }
  const stored = await getStoredOrSeed(KEYS.CATEGORIES, INITIAL_CATEGORIES);
  const existingCatIds = new Set(stored.map((c) => c.id));
  const missingCats = INITIAL_CATEGORIES.filter((c) => !existingCatIds.has(c.id));
  if (missingCats.length > 0) {
    const allCats = [...stored, ...missingCats];
    await saveStored(KEYS.CATEGORIES, allCats);
    return allCats;
  }
  return stored;
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
      logFallback('addCategory', e);
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
      logFallback('updateCategory', e);
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
      logFallback('deleteCategory', e);
    }
  }
  const existing = await getCategories();
  const updated = existing.filter((c) => c.id !== catId);
  await saveStored(KEYS.CATEGORIES, updated);
}

// ======================== SERVICES ========================
export async function getServices(): Promise<Service[]> {
  const firestoreDb = db;
  if (isFirebaseConfigured() && firestoreDb) {
    try {
      const snap = await withTimeout(getDocs(collection(firestoreDb, 'services')));
      if (!snap.empty) {
        const firestoreServices = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service);
        const existingIds = new Set(firestoreServices.map((s) => s.id));
        const missing = INITIAL_SERVICES.filter((s) => !existingIds.has(s.id));
        
        // Attempt background seed write to Firestore for missing services (without blocking)
        if (missing.length > 0) {
          missing.forEach((s) => {
            setDoc(doc(firestoreDb, 'services', s.id), s, { merge: true }).catch(() => {});
          });
        }
        
        // Always combine firestore services with all initial catalog services
        // so that customer views never drop or miss any service
        const allServices = [...firestoreServices, ...missing];
        await saveStored(KEYS.SERVICES, allServices);
        return allServices;
      }

      // If Firestore services collection is completely empty, attempt background seed
      INITIAL_SERVICES.forEach((s) => {
        setDoc(doc(firestoreDb, 'services', s.id), s, { merge: true }).catch(() => {});
      });
      await saveStored(KEYS.SERVICES, INITIAL_SERVICES);
      return INITIAL_SERVICES;
    } catch (e) {
      logFallback('getServices', e);
    }
  }

  const stored = await getStoredOrSeed(KEYS.SERVICES, INITIAL_SERVICES);
  const existingIds = new Set(stored.map((s) => s.id));
  const missing = INITIAL_SERVICES.filter((s) => !existingIds.has(s.id));
  if (missing.length > 0) {
    const merged = [...stored, ...missing];
    await saveStored(KEYS.SERVICES, merged);
    return merged;
  }
  return stored;
}

export async function getServiceById(id: string): Promise<Service | undefined> {
  const services = await getServices();
  const found = services.find((s) => s.id === id);
  if (found) return found;
  return INITIAL_SERVICES.find((s) => s.id === id);
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
      logFallback('addService', e);
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
      logFallback('updateService', e);
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
      logFallback('deleteService', e);
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
      const snap = await withTimeout(getDocs(q));
      if (!snap.empty) {
        const firestoreProvs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
        const existingProvIds = new Set(firestoreProvs.map((p) => p.id));
        const missingProvs = INITIAL_PROVIDERS.filter((p) => !existingProvIds.has(p.id));
        const allProvs = [...firestoreProvs, ...missingProvs];
        await saveStored(KEYS.PROVIDERS, allProvs);
        return allProvs;
      }
    } catch (e) {
      logFallback('getProviders', e);
    }
  }
  const stored = await getStoredOrSeed(KEYS.PROVIDERS, INITIAL_PROVIDERS);
  const existingProvIds = new Set(stored.map((p) => p.id));
  const missingProvs = INITIAL_PROVIDERS.filter((p) => !existingProvIds.has(p.id));
  if (missingProvs.length > 0) {
    const allProvs = [...stored, ...missingProvs];
    await saveStored(KEYS.PROVIDERS, allProvs);
    return allProvs;
  }
  return stored;
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
      logFallback('updateProviderStatus', e);
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

// ======================== STATUS MAPPING & NORMALIZATION ========================
export function mapStatusToOrderDisplay(status: BookingStatus): string {
  switch (status) {
    case 'pending':
      return 'Placed';
    case 'accepted':
      return 'Accepted';
    case 'on_the_way':
      return 'On The Way';
    case 'in_progress':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Placed';
  }
}

export function normalizeOrderDoc(docId: string, data: any): Booking {
  const effectiveUserId = data.userId || data.customerId || '';
  const effectiveTotal =
    data.totalPrice !== undefined
      ? data.totalPrice
      : data.totalAmount !== undefined
      ? data.totalAmount
      : data.price || 0;

  const rawStatus = String(data.status || '').toLowerCase().trim();
  const rawOrderStatus = String(data.orderStatus || '').toLowerCase().trim();
  const rawBookingStatus = String(data.bookingStatus || '').toLowerCase().trim();

  let effectiveStatus: BookingStatus = 'pending';
  if (rawStatus === 'placed' || rawStatus === 'pending') {
    effectiveStatus = 'pending';
  } else if (rawStatus === 'accepted' || rawStatus === 'confirmed') {
    effectiveStatus = 'accepted';
  } else if (rawStatus === 'on_the_way' || rawStatus === 'on the way' || rawStatus === 'ontheway') {
    effectiveStatus = 'on_the_way';
  } else if (rawStatus === 'in_progress' || rawStatus === 'inprogress' || rawStatus === 'processing') {
    effectiveStatus = 'in_progress';
  } else if (rawStatus === 'completed' || rawStatus === 'finished' || rawStatus === 'done') {
    effectiveStatus = 'completed';
  } else if (rawStatus === 'cancelled' || rawStatus === 'canceled' || rawStatus === 'rejected' || rawStatus === 'declined') {
    effectiveStatus = 'cancelled';
  } else if (rawOrderStatus) {
    if (rawOrderStatus === 'placed' || rawOrderStatus === 'pending' || rawOrderStatus === 'pending provider acceptance') {
      effectiveStatus = 'pending';
    } else if (rawOrderStatus === 'accepted' || rawOrderStatus === 'confirmed') {
      effectiveStatus = 'accepted';
    } else if (rawOrderStatus === 'processing' || rawOrderStatus === 'in_progress') {
      effectiveStatus = 'in_progress';
    } else if (rawOrderStatus === 'on_the_way' || rawOrderStatus === 'on the way') {
      effectiveStatus = 'on_the_way';
    } else if (rawOrderStatus === 'completed') {
      effectiveStatus = 'completed';
    } else if (rawOrderStatus === 'cancelled' || rawOrderStatus === 'canceled' || rawOrderStatus === 'rejected' || rawOrderStatus === 'declined') {
      effectiveStatus = 'cancelled';
    }
  } else if (rawBookingStatus) {
    if (rawBookingStatus === 'placed' || rawBookingStatus === 'pending') {
      effectiveStatus = 'pending';
    } else if (rawBookingStatus === 'accepted') {
      effectiveStatus = 'accepted';
    } else if (rawBookingStatus === 'completed') {
      effectiveStatus = 'completed';
    } else if (rawBookingStatus === 'cancelled' || rawBookingStatus === 'declined') {
      effectiveStatus = 'cancelled';
    }
  }

  const items =
    data.items && Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : [
          {
            id: data.serviceId || docId,
            serviceId: data.serviceId || '',
            title: data.serviceTitle || data.serviceName || 'Home Service',
            price: effectiveTotal,
            quantity: data.quantity || 1,
            image: data.serviceImage,
          },
        ];

  const orderStatusDisplay = data.orderStatus || mapStatusToOrderDisplay(effectiveStatus);

  return {
    ...data,
    id: docId,
    orderId: data.orderId || data.bookingId || docId,
    bookingId: data.bookingId || data.orderId || docId,
    userId: effectiveUserId,
    customerId: effectiveUserId,
    customerName: data.customerName || 'Customer',
    customerEmail: data.customerEmail || '',
    customerPhone: data.customerPhone || data.customerContact || '',
    customerContact: data.customerContact || data.customerPhone || data.customerEmail || '',
    providerId: data.providerId || '',
    providerName: data.providerName || '',
    providerEmail: data.providerEmail,
    providerAvatar: data.providerAvatar,
    providerPhone: data.providerPhone,
    serviceId: data.serviceId || items[0]?.serviceId || '',
    serviceTitle: data.serviceTitle || data.serviceName || items[0]?.title || 'Home Service',
    serviceName: data.serviceName || data.serviceTitle || items[0]?.title || 'Home Service',
    categoryName: data.categoryName || 'General',
    serviceImage: data.serviceImage || items[0]?.image,
    items,
    quantity: data.quantity || items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
    price: data.price !== undefined ? data.price : effectiveTotal,
    totalPrice: effectiveTotal,
    totalAmount: effectiveTotal,
    date: data.date || data.bookingDate || new Date().toISOString().split('T')[0],
    bookingDate: data.bookingDate || data.date || new Date().toISOString().split('T')[0],
    timeSlot: data.timeSlot || data.bookingTime || 'Standard Time',
    bookingTime: data.bookingTime || data.timeSlot || 'Standard Time',
    address: data.address || {
      id: 'addr-default',
      label: 'Home',
      street: 'Primary Address',
      city: 'Springfield',
    },
    notes: data.notes || '',
    status: effectiveStatus,
    bookingStatus: data.bookingStatus || orderStatusDisplay,
    orderStatus: orderStatusDisplay,
    providerStatus: data.providerStatus || (effectiveStatus === 'accepted' ? 'Accepted' : effectiveStatus === 'cancelled' ? 'Rejected' : 'Pending'),
    paymentStatus: data.paymentStatus || 'unpaid',
    paymentMethod: data.paymentMethod || 'cash',
    couponCode: data.couponCode,
    discountAmount: data.discountAmount,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    cancellationReason: data.cancellationReason,
  };
}

// ======================== REAL-TIME ORDER SYNCHRONIZATION ========================
export function subscribeToOrders(
  userId: string,
  role: UserRole,
  onUpdate: (orders: Booking[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!isFirebaseConfigured() || !db || !userId) {
    return () => {};
  }

  try {
    let q;
    if (role === 'admin') {
      // Admin sees ALL orders from the central collection
      q = collection(db, 'orders');
    } else if (role === 'provider') {
      if (userId && userId !== 'prov-1') {
        q = query(collection(db, 'orders'), where('providerId', 'in', [userId, 'prov-1']));
      } else {
        q = query(collection(db, 'orders'), where('providerId', '==', userId || 'prov-1'));
      }
    } else {
      // Customer sees ONLY their own orders
      q = query(collection(db, 'orders'), where('userId', '==', userId));
    }

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const remoteList = snapshot.docs.map((d) => normalizeOrderDoc(d.id, d.data()));

          // Merge with locally stored device orders so unsynced device orders are NEVER lost
          const userKey = getUserStorageKey(KEYS.BOOKINGS, userId);
          const ordersUserKey = getUserStorageKey(KEYS.ORDERS, userId);
          const localOrders = await getStoredList<Booking>(ordersUserKey);
          const localBookings = await getStoredList<Booking>(userKey);
          const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
          const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);

          const orderMap = new Map<string, Booking>();
          for (const r of remoteList) {
            if (r && r.id) orderMap.set(r.id, r);
          }

          for (const loc of [...localOrders, ...localBookings, ...globalOrders, ...globalBookings]) {
            if (!loc || !loc.id) continue;
            if (!orderMap.has(loc.id)) {
              if (role === 'provider') {
                if (loc.providerId === userId || loc.providerId === 'prov-1' || !loc.providerId || userId === 'prov-1') {
                  orderMap.set(loc.id, loc);
                }
              } else if (role === 'customer') {
                if (loc.userId === userId || loc.customerId === userId || userId === 'cust-demo' || !loc.userId) {
                  orderMap.set(loc.id, loc);
                }
              } else {
                orderMap.set(loc.id, loc);
              }
            } else {
              const existing = orderMap.get(loc.id)!;
              const locTime = new Date(loc.updatedAt || loc.createdAt).getTime();
              const existTime = new Date(existing.updatedAt || existing.createdAt).getTime();
              if (locTime > existTime) {
                orderMap.set(loc.id, loc);
              }
            }
          }

          const merged = Array.from(orderMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          saveStored(userKey, merged);
          saveStored(ordersUserKey, merged);
          onUpdate(merged);
        } catch {
          const fallbackList = snapshot.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
          onUpdate(fallbackList);
        }
      },
      async (error) => {
        logFallback('subscribeToOrders', error);
        // Fallback: If live snapshot was blocked due to permissions or network, trigger local fallback list
        try {
          const localFallback = await getBookings(userId, role);
          if (localFallback.length > 0) {
            onUpdate(localFallback);
          }
        } catch {
          // ignore
        }
        if (onError) onError(error);
      }
    );

    return unsub;
  } catch (err) {
    console.warn('Failed attaching subscribeToOrders listener:', err);
    return () => {};
  }
}

// ======================== ORDERS & BOOKINGS PERSISTENCE ========================
export async function getBookings(userId?: string, role?: UserRole): Promise<Booking[]> {
  if (!userId) {
    return [];
  }

  const userKey = getUserStorageKey(KEYS.BOOKINGS, userId);
  const ordersUserKey = getUserStorageKey(KEYS.ORDERS, userId);

  let remoteOrders: Booking[] = [];

  if (isFirebaseConfigured() && db) {
    try {
      // 1. Primary query on central 'orders' collection
      let qOrders;
      if (role === 'admin') {
        qOrders = collection(db, 'orders');
      } else if (role === 'provider') {
        if (userId && userId !== 'prov-1') {
          qOrders = query(collection(db, 'orders'), where('providerId', 'in', [userId, 'prov-1']));
        } else {
          qOrders = query(collection(db, 'orders'), where('providerId', '==', userId || 'prov-1'));
        }
      } else {
        qOrders = query(collection(db, 'orders'), where('userId', '==', userId));
      }

      const snapOrders = await withTimeout(getDocs(qOrders), 2500);
      if (!snapOrders.empty) {
        remoteOrders = snapOrders.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
      } else if (role === 'customer') {
        // Check where('customerId', '==', userId) in 'orders'
        const snapCust = await withTimeout(
          getDocs(query(collection(db, 'orders'), where('customerId', '==', userId))),
          2000
        );
        if (!snapCust.empty) {
          remoteOrders = snapCust.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        }
      }

      // 2. Fallback: check legacy 'bookings' collection if 'orders' returned empty
      if (remoteOrders.length === 0) {
        let qBookings;
        if (role === 'admin') {
          qBookings = collection(db, 'bookings');
        } else if (role === 'provider') {
          if (userId && userId !== 'prov-1') {
            qBookings = query(collection(db, 'bookings'), where('providerId', 'in', [userId, 'prov-1']));
          } else {
            qBookings = query(collection(db, 'bookings'), where('providerId', '==', userId || 'prov-1'));
          }
        } else {
          qBookings = query(collection(db, 'bookings'), where('customerId', '==', userId));
        }
        const snapBookings = await withTimeout(getDocs(qBookings), 2000);
        if (!snapBookings.empty) {
          remoteOrders = snapBookings.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        }
      }
    } catch (e) {
      logFallback('getBookings / getOrders', e);
    }
  }

  // Gather local storage orders across device (NEVER overwrite or discard local device orders)
  let localPool: Booking[] = [];

  // 1. FOR ADMIN: Always load all device orders from global keys & seed data
  if (role === 'admin') {
    const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
    const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
    localPool.push(...globalOrders, ...globalBookings);
    localPool.push(...INITIAL_BOOKINGS.map((b) => normalizeOrderDoc(b.id, b)));
  } else if (role === 'provider') {
    // 2. FOR PROVIDER: Merge provider-specific, demo prov-1, and all device-created orders
    const userProvOrders = await getStoredList<Booking>(ordersUserKey);
    const userProvBookings = await getStoredList<Booking>(userKey);
    localPool.push(...userProvOrders, ...userProvBookings);

    if (userId !== 'prov-1') {
      const p1Orders = await getStoredList<Booking>(getUserStorageKey(KEYS.ORDERS, 'prov-1'));
      const p1Bookings = await getStoredList<Booking>(getUserStorageKey(KEYS.BOOKINGS, 'prov-1'));
      localPool.push(...p1Orders, ...p1Bookings);
    }

    const allDeviceOrders = await getStoredList<Booking>(KEYS.ORDERS);
    const allDeviceBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
    localPool.push(...allDeviceOrders, ...allDeviceBookings);

    // Scan all AsyncStorage keys for any bookings created on this device
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const deviceOrderKeys = allKeys.filter(
        (k) => (k.startsWith('@fixora_orders') || k.startsWith('@fixora_bookings')) &&
               k !== ordersUserKey && k !== userKey
      );
      for (const k of deviceOrderKeys) {
        const storedList = await getStoredList<Booking>(k);
        localPool.push(...storedList);
      }
    } catch {
      // ignore
    }

    const seed = INITIAL_BOOKINGS.filter((b) => b.providerId === 'prov-1' || b.providerId === userId).map((b) =>
      normalizeOrderDoc(b.id, b)
    );
    localPool.push(...seed);
  } else {
    // 3. FOR CUSTOMER: Check customer scoped + all device created orders matching customer
    const custOrders = await getStoredList<Booking>(ordersUserKey);
    const custBookings = await getStoredList<Booking>(userKey);
    localPool.push(...custOrders, ...custBookings);

    const allDeviceOrders = await getStoredList<Booking>(KEYS.ORDERS);
    const allDeviceBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
    const matchedCustOrders = [...allDeviceOrders, ...allDeviceBookings].filter(
      (b) => b.userId === userId || b.customerId === userId
    );
    localPool.push(...matchedCustOrders);

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const deviceOrderKeys = allKeys.filter(
        (k) => (k.startsWith('@fixora_orders') || k.startsWith('@fixora_bookings')) &&
               k !== ordersUserKey && k !== userKey
      );
      for (const k of deviceOrderKeys) {
        const storedList = await getStoredList<Booking>(k);
        const matches = storedList.filter((b) => b.userId === userId || b.customerId === userId);
        localPool.push(...matches);
      }
    } catch {
      // ignore
    }

    if (userId === 'cust-demo') {
      const seed = INITIAL_BOOKINGS.filter((b) => b.customerId === 'cust-demo').map((b) =>
        normalizeOrderDoc(b.id, b)
      );
      localPool.push(...seed);
    }
  }

  // Unified deduplication map: remote orders + local orders
  const orderMap = new Map<string, Booking>();
  for (const r of remoteOrders) {
    if (r && r.id) orderMap.set(r.id, r);
  }

  for (const item of localPool) {
    if (!item || !item.id) continue;
    const existing = orderMap.get(item.id);
    if (!existing) {
      orderMap.set(item.id, item);
    } else {
      const itemTime = new Date(item.updatedAt || item.createdAt).getTime();
      const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      if (itemTime >= existingTime) {
        orderMap.set(item.id, item);
      }
    }
  }

  let finalList = Array.from(orderMap.values());

  if (role === 'provider') {
    finalList = finalList.filter(
      (b) =>
        b.providerId === userId ||
        b.providerId === 'prov-1' ||
        !b.providerId ||
        userId === 'prov-1' ||
        (b.providerEmail && b.providerEmail.toLowerCase() === (userId || '').toLowerCase())
    );
  } else if (role === 'customer') {
    finalList = finalList.filter(
      (b) =>
        b.userId === userId ||
        b.customerId === userId ||
        userId === 'cust-demo' ||
        !b.userId
    );
  }

  finalList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  await saveStored(ordersUserKey, finalList);
  await saveStored(userKey, finalList);

  return finalList;
}

export const getOrders = getBookings;

export async function getBookingById(
  id: string,
  userId?: string,
  role?: UserRole
): Promise<Booking | undefined> {
  if (!id) return undefined;
  const cleanId = id.trim().toLowerCase();

  const matchBooking = (b: any): boolean => {
    if (!b) return false;
    const bid = String(b.id || '').trim().toLowerCase();
    const bOrderId = String(b.orderId || '').trim().toLowerCase();
    const bBookingId = String(b.bookingId || '').trim().toLowerCase();
    return bid === cleanId || bOrderId === cleanId || bBookingId === cleanId;
  };

  // 1. FAST LOCAL-FIRST CHECK: Check all local caches instantly (<2ms)
  // Check user-scoped orders and bookings
  if (userId) {
    const ordersUser = await getStoredList<Booking>(getUserStorageKey(KEYS.ORDERS, userId));
    const m1 = ordersUser.find(matchBooking);
    if (m1) return m1;

    const bksUser = await getStoredList<Booking>(getUserStorageKey(KEYS.BOOKINGS, userId));
    const m2 = bksUser.find(matchBooking);
    if (m2) return m2;
  }

  // Check demo provider / prov-1 scoped cache
  const provOrders = await getStoredList<Booking>(getUserStorageKey(KEYS.ORDERS, 'prov-1'));
  const mProvOrders = provOrders.find(matchBooking);
  if (mProvOrders) return mProvOrders;

  const provBookings = await getStoredList<Booking>(getUserStorageKey(KEYS.BOOKINGS, 'prov-1'));
  const mProvBookings = provBookings.find(matchBooking);
  if (mProvBookings) return mProvBookings;

  // Check global orders and bookings
  const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
  const mGlobalOrders = globalOrders.find(matchBooking);
  if (mGlobalOrders) return mGlobalOrders;

  const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
  const mGlobalBookings = globalBookings.find(matchBooking);
  if (mGlobalBookings) return mGlobalBookings;

  // Check all AsyncStorage keys on device for this order
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const deviceOrderKeys = allKeys.filter(
      (k) => k.startsWith('@fixora_orders') || k.startsWith('@fixora_bookings')
    );
    for (const key of deviceOrderKeys) {
      const list = await getStoredList<Booking>(key);
      const mAny = list.find(matchBooking);
      if (mAny) return mAny;
    }
  } catch {
    // ignore
  }

  // Check seed bookings
  const seedMatch = INITIAL_BOOKINGS.find(matchBooking);
  if (seedMatch) return normalizeOrderDoc(seedMatch.id, seedMatch);

  // 2. REMOTE FIRESTORE FALLBACK (if not found locally)
  if (isFirebaseConfigured() && db) {
    try {
      const snapOrder = await withTimeout(getDoc(doc(db, 'orders', id)), 2000);
      if (snapOrder.exists()) {
        const docObj = normalizeOrderDoc(snapOrder.id, snapOrder.data());
        if (userId) {
          const userKey = getUserStorageKey(KEYS.ORDERS, userId);
          const current = await getStoredList<Booking>(userKey);
          await saveStored(userKey, upsertBookingInList(current, docObj));
        }
        return docObj;
      }

      const snapBooking = await withTimeout(getDoc(doc(db, 'bookings', id)), 2000);
      if (snapBooking.exists()) {
        const docObj = normalizeOrderDoc(snapBooking.id, snapBooking.data());
        return docObj;
      }
    } catch (e) {
      logFallback('getBookingById', e);
    }
  }

  return undefined;
}

export const getOrderById = getBookingById;

export async function createBooking(
  bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'status'> & Partial<Booking>
): Promise<Booking> {
  const orderId = bookingData.orderId || bookingData.id || `ord-${Date.now()}`;
  const effectiveUserId = bookingData.userId || bookingData.customerId;

  const initialStatus: BookingStatus = bookingData.status || 'pending';
  const orderStatusDisplay = bookingData.orderStatus || mapStatusToOrderDisplay(initialStatus);

  const newOrder: Booking = {
    ...bookingData,
    id: orderId,
    orderId,
    bookingId: orderId,
    userId: effectiveUserId,
    customerId: effectiveUserId,
    customerName: bookingData.customerName || 'Customer',
    customerEmail: bookingData.customerEmail || '',
    customerPhone: bookingData.customerPhone || bookingData.customerContact || '',
    customerContact: bookingData.customerContact || bookingData.customerPhone || bookingData.customerEmail || '',
    serviceId: bookingData.serviceId,
    serviceTitle: bookingData.serviceTitle || bookingData.serviceName || 'Home Service',
    serviceName: bookingData.serviceName || bookingData.serviceTitle || 'Home Service',
    categoryName: bookingData.categoryName,
    serviceImage: bookingData.serviceImage,
    providerId: bookingData.providerId || 'prov-1',
    providerName: bookingData.providerName || 'David Miller',
    providerAvatar: bookingData.providerAvatar,
    providerPhone: bookingData.providerPhone,
    items: bookingData.items || [
      {
        id: bookingData.serviceId,
        serviceId: bookingData.serviceId,
        title: bookingData.serviceTitle || bookingData.serviceName || 'Home Service',
        price: bookingData.totalPrice,
        quantity: bookingData.quantity || 1,
        image: bookingData.serviceImage,
      },
    ],
    quantity: bookingData.quantity || 1,
    price: bookingData.price !== undefined ? bookingData.price : bookingData.totalPrice,
    totalPrice: bookingData.totalPrice,
    totalAmount: bookingData.totalAmount !== undefined ? bookingData.totalAmount : bookingData.totalPrice,
    date: bookingData.date || bookingData.bookingDate || new Date().toISOString().split('T')[0],
    bookingDate: bookingData.bookingDate || bookingData.date || new Date().toISOString().split('T')[0],
    timeSlot: bookingData.timeSlot || bookingData.bookingTime || 'Standard Time',
    bookingTime: bookingData.bookingTime || bookingData.timeSlot || 'Standard Time',
    address: bookingData.address,
    notes: bookingData.notes || '',
    status: initialStatus,
    bookingStatus: initialStatus === 'pending' ? 'Pending' : orderStatusDisplay,
    orderStatus: orderStatusDisplay,
    providerStatus: bookingData.providerStatus || 'Pending',
    paymentStatus: bookingData.paymentStatus || 'unpaid',
    paymentMethod: bookingData.paymentMethod || 'cash',
    couponCode: bookingData.couponCode,
    discountAmount: bookingData.discountAmount,
    createdAt: bookingData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const firestoreDb = db;
  if (isFirebaseConfigured() && firestoreDb) {
    try {
      // 1. Save to central 'orders' collection (primary) with timeout safety
      const firestoreOrder = omitUndefinedDeep(newOrder);
      await withTimeout(setDoc(doc(firestoreDb, 'orders', newOrder.id), firestoreOrder), 3000);
      // 2. Mirror to 'bookings' collection for backward compatibility
      await withTimeout(setDoc(doc(firestoreDb, 'bookings', newOrder.id), firestoreOrder), 3000);
    } catch (e) {
      logFallback('createOrder / createBooking', e);
    }
  }

  // Save to customer's user-scoped storage cache
  if (newOrder.customerId) {
    const custKey = getUserStorageKey(KEYS.BOOKINGS, newOrder.customerId);
    const ordersCustKey = getUserStorageKey(KEYS.ORDERS, newOrder.customerId);
    const existingCust = await getStoredList<Booking>(custKey);
    const updatedCust = [newOrder, ...existingCust.filter((b) => b.id !== newOrder.id)];
    await saveStored(custKey, updatedCust);
    await saveStored(ordersCustKey, updatedCust);
  }

  // If provider has cache on device, update it too
  const effectiveProvId = newOrder.providerId || 'prov-1';
  const provKey = getUserStorageKey(KEYS.BOOKINGS, effectiveProvId);
  const provOrdersKey = getUserStorageKey(KEYS.ORDERS, effectiveProvId);
  const existingProv = await getStoredList<Booking>(provKey);
  const updatedProv = [newOrder, ...existingProv.filter((b) => b.id !== newOrder.id)];
  await saveStored(provKey, updatedProv);
  await saveStored(provOrdersKey, updatedProv);

  if (effectiveProvId !== 'prov-1') {
    const demoProvKey = getUserStorageKey(KEYS.BOOKINGS, 'prov-1');
    const demoProvOrdersKey = getUserStorageKey(KEYS.ORDERS, 'prov-1');
    const existingDemoProv = await getStoredList<Booking>(demoProvKey);
    const updatedDemoProv = [newOrder, ...existingDemoProv.filter((b) => b.id !== newOrder.id)];
    await saveStored(demoProvKey, updatedDemoProv);
    await saveStored(demoProvOrdersKey, updatedDemoProv);
  }

  // Also check if an active provider is signed in locally on device
  try {
    const authUserRaw = await AsyncStorage.getItem('@fixora_auth_user');
    if (authUserRaw) {
      const authUser = JSON.parse(authUserRaw);
      if (authUser?.role === 'provider' && authUser.id && authUser.id !== effectiveProvId && authUser.id !== 'prov-1') {
        const authProvKey = getUserStorageKey(KEYS.BOOKINGS, authUser.id);
        const authProvOrdersKey = getUserStorageKey(KEYS.ORDERS, authUser.id);
        const existingAuthProv = await getStoredList<Booking>(authProvKey);
        const updatedAuthProv = [newOrder, ...existingAuthProv.filter((b) => b.id !== newOrder.id)];
        await saveStored(authProvKey, updatedAuthProv);
        await saveStored(authProvOrdersKey, updatedAuthProv);
      }
    }
  } catch {
    // ignore
  }

  // Also save to global cache
  const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
  await saveStored(KEYS.ORDERS, [newOrder, ...globalOrders.filter((b) => b.id !== newOrder.id)]);
  const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
  await saveStored(KEYS.BOOKINGS, [newOrder, ...globalBookings.filter((b) => b.id !== newOrder.id)]);

  // Trigger automated notification to provider
  const provNotifTitle = 'New Service Request 🔔';
  const provNotifMsg = `New service request from ${newOrder.customerName} for ${newOrder.serviceTitle} ($${newOrder.totalPrice}) on ${newOrder.date} (${newOrder.timeSlot}).`;

  await addNotification({
    userId: effectiveProvId,
    title: provNotifTitle,
    message: provNotifMsg,
    type: 'booking',
    read: false,
    bookingId: newOrder.id,
  });

  if (effectiveProvId !== 'prov-1') {
    await addNotification({
      userId: 'prov-1',
      title: provNotifTitle,
      message: provNotifMsg,
      type: 'booking',
      read: false,
      bookingId: newOrder.id,
    });
  }

  // Also notify logged in provider on device if any
  try {
    const authUserRaw = await AsyncStorage.getItem('@fixora_auth_user');
    if (authUserRaw) {
      const authUser = JSON.parse(authUserRaw);
      if (authUser?.role === 'provider' && authUser.id && authUser.id !== effectiveProvId && authUser.id !== 'prov-1') {
        await addNotification({
          userId: authUser.id,
          title: provNotifTitle,
          message: provNotifMsg,
          type: 'booking',
          read: false,
          bookingId: newOrder.id,
        });
      }
    }
  } catch {
    // ignore
  }

  // Trigger automated notification to customer
  if (newOrder.customerId) {
    await addNotification({
      userId: newOrder.customerId,
      title: 'Booking Confirmed! 📅',
      message: `Your booking for ${newOrder.serviceTitle} has been submitted to ${newOrder.providerName} and is awaiting provider acceptance.`,
      type: 'booking',
      read: false,
      bookingId: newOrder.id,
    });
  }

  return newOrder;
}

export const createOrder = createBooking;

export function upsertBookingInList(list: Booking[], updated: Booking): Booking[] {
  const index = list.findIndex(
    (b) =>
      b.id === updated.id ||
      b.orderId === updated.id ||
      (updated.orderId && (b.id === updated.orderId || b.orderId === updated.orderId))
  );
  if (index >= 0) {
    const copy = [...list];
    copy[index] = updated;
    return copy;
  }
  return [updated, ...list];
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string,
  userId?: string,
  role?: UserRole,
  extraUpdates?: {
    orderStatus?: string;
    providerStatus?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    stripePaymentId?: string;
    stripeChargeId?: string;
    stripeReceiptUrl?: string;
  }
): Promise<Booking | null> {
  let target: Booking | null = null;

  if (isFirebaseConfigured() && db) {
    try {
      // Check orders collection first
      const snapOrder = await getDoc(doc(db, 'orders', bookingId));
      if (snapOrder.exists()) {
        target = normalizeOrderDoc(snapOrder.id, snapOrder.data());
      } else {
        const snapBooking = await getDoc(doc(db, 'bookings', bookingId));
        if (snapBooking.exists()) {
          target = normalizeOrderDoc(snapBooking.id, snapBooking.data());
        }
      }
    } catch (e) {
      logFallback('getDoc order/booking', e);
    }
  }

  if (!target) {
    // 1. Check user-scoped orders & bookings
    if (userId) {
      const ordersUserKey = getUserStorageKey(KEYS.ORDERS, userId);
      const list1 = await getStoredList<Booking>(ordersUserKey);
      target = list1.find((b) => b.id === bookingId || b.orderId === bookingId) || null;

      if (!target) {
        const bookingsUserKey = getUserStorageKey(KEYS.BOOKINGS, userId);
        const list2 = await getStoredList<Booking>(bookingsUserKey);
        target = list2.find((b) => b.id === bookingId || b.orderId === bookingId) || null;
      }
    }

    // 2. Check prov-1 scoped cache
    if (!target) {
      const provOrdersKey = getUserStorageKey(KEYS.ORDERS, 'prov-1');
      const listProvOrders = await getStoredList<Booking>(provOrdersKey);
      target = listProvOrders.find((b) => b.id === bookingId || b.orderId === bookingId) || null;

      if (!target) {
        const provBookingsKey = getUserStorageKey(KEYS.BOOKINGS, 'prov-1');
        const listProvBookings = await getStoredList<Booking>(provBookingsKey);
        target = listProvBookings.find((b) => b.id === bookingId || b.orderId === bookingId) || null;
      }
    }

    // 3. Check global device orders & bookings
    if (!target) {
      const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
      target = globalOrders.find((b) => b.id === bookingId || b.orderId === bookingId) || null;
    }
    if (!target) {
      const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
      target = globalBookings.find((b) => b.id === bookingId || b.orderId === bookingId) || null;
    }

    // 4. Check initial seed catalog
    if (!target) {
      const seedMatch = INITIAL_BOOKINGS.find((b) => b.id === bookingId || b.orderId === bookingId);
      if (seedMatch) {
        target = normalizeOrderDoc(seedMatch.id, seedMatch);
      }
    }
  }

  if (!target) return null;

  let providerStatusDisplay = extraUpdates?.providerStatus || target.providerStatus;
  if (!providerStatusDisplay) {
    if (status === 'accepted') {
      providerStatusDisplay = 'Accepted';
    } else if (
      status === 'cancelled' &&
      (reason?.toLowerCase().includes('decline') || reason?.toLowerCase().includes('reject'))
    ) {
      providerStatusDisplay = 'Rejected';
    } else if (status === 'pending') {
      providerStatusDisplay = 'Pending';
    } else {
      providerStatusDisplay = target.providerStatus || 'Accepted';
    }
  }

  let orderStatusDisplay = extraUpdates?.orderStatus;
  if (!orderStatusDisplay) {
    if (status === 'pending') {
      orderStatusDisplay = 'Pending Provider Acceptance';
    } else if (status === 'accepted') {
      orderStatusDisplay = 'Accepted';
    } else if (status === 'cancelled' && providerStatusDisplay === 'Rejected') {
      orderStatusDisplay = 'Rejected';
    } else if (status === 'cancelled') {
      orderStatusDisplay = 'Cancelled';
    } else if (status === 'completed') {
      orderStatusDisplay = 'Completed';
    } else {
      orderStatusDisplay = 'In Progress';
    }
  }

  const updatedBooking: Booking = {
    ...target,
    status,
    bookingStatus: orderStatusDisplay,
    orderStatus: orderStatusDisplay,
    providerStatus: providerStatusDisplay,
    paymentStatus: extraUpdates?.paymentStatus || target.paymentStatus,
    paymentMethod: extraUpdates?.paymentMethod || target.paymentMethod,
    stripePaymentId: extraUpdates?.stripePaymentId !== undefined ? extraUpdates.stripePaymentId : target.stripePaymentId,
    stripeChargeId: extraUpdates?.stripeChargeId !== undefined ? extraUpdates.stripeChargeId : target.stripeChargeId,
    stripeReceiptUrl: extraUpdates?.stripeReceiptUrl !== undefined ? extraUpdates.stripeReceiptUrl : target.stripeReceiptUrl,
    updatedAt: new Date().toISOString(),
    ...(reason ? { cancellationReason: reason } : {}),
  };

  if (isFirebaseConfigured() && db) {
    const firestore = db;
    try {
      const updateData: Record<string, any> = {
        status,
        bookingStatus: orderStatusDisplay,
        orderStatus: orderStatusDisplay,
        providerStatus: providerStatusDisplay,
        paymentStatus: updatedBooking.paymentStatus,
        paymentMethod: updatedBooking.paymentMethod,
        ...(updatedBooking.stripePaymentId ? { stripePaymentId: updatedBooking.stripePaymentId } : {}),
        ...(updatedBooking.stripeChargeId ? { stripeChargeId: updatedBooking.stripeChargeId } : {}),
        ...(updatedBooking.stripeReceiptUrl ? { stripeReceiptUrl: updatedBooking.stripeReceiptUrl } : {}),
        updatedAt: updatedBooking.updatedAt,
        ...(reason ? { cancellationReason: reason } : {}),
      };

      const firestoreUpdate = omitUndefinedDeep(updateData);
      const firestoreBooking = omitUndefinedDeep(updatedBooking);

      // Update in central 'orders' collection
      await updateDoc(doc(firestore, 'orders', bookingId), firestoreUpdate).catch(async () => {
        await setDoc(doc(firestore, 'orders', bookingId), firestoreBooking, { merge: true });
      });

      // Update in 'bookings' collection
      await updateDoc(doc(firestore, 'bookings', bookingId), firestoreUpdate).catch(async () => {
        await setDoc(doc(firestore, 'bookings', bookingId), firestoreBooking, { merge: true });
      });
    } catch (e) {
      logFallback('updateBookingStatus', e);
    }
  }

  // Update in customer's scoped storage
  if (target.customerId) {
    const custKey = getUserStorageKey(KEYS.BOOKINGS, target.customerId);
    const ordersCustKey = getUserStorageKey(KEYS.ORDERS, target.customerId);
    const custBookings = await getStoredList<Booking>(custKey);
    const updatedCust = upsertBookingInList(custBookings, updatedBooking);
    await saveStored(custKey, updatedCust);
    await saveStored(ordersCustKey, updatedCust);
  }

  // Update in provider's scoped storage
  const effectiveProvId = target.providerId || userId || 'prov-1';
  const provKey = getUserStorageKey(KEYS.BOOKINGS, effectiveProvId);
  const provOrdersKey = getUserStorageKey(KEYS.ORDERS, effectiveProvId);
  const provBookings = await getStoredList<Booking>(provKey);
  const updatedProv = upsertBookingInList(provBookings, updatedBooking);
  await saveStored(provKey, updatedProv);
  await saveStored(provOrdersKey, updatedProv);

  if (effectiveProvId !== 'prov-1') {
    const demoProvKey = getUserStorageKey(KEYS.BOOKINGS, 'prov-1');
    const demoProvOrdersKey = getUserStorageKey(KEYS.ORDERS, 'prov-1');
    const demoProvList = await getStoredList<Booking>(demoProvKey);
    const updatedDemo = upsertBookingInList(demoProvList, updatedBooking);
    await saveStored(demoProvKey, updatedDemo);
    await saveStored(demoProvOrdersKey, updatedDemo);
  }

  if (userId && userId !== effectiveProvId && userId !== 'prov-1') {
    const callerProvKey = getUserStorageKey(KEYS.BOOKINGS, userId);
    const callerProvOrdersKey = getUserStorageKey(KEYS.ORDERS, userId);
    const callerList = await getStoredList<Booking>(callerProvKey);
    const updatedCaller = upsertBookingInList(callerList, updatedBooking);
    await saveStored(callerProvKey, updatedCaller);
    await saveStored(callerProvOrdersKey, updatedCaller);
  }

  // Update in global storage (for Admin and all portal synchronizations)
  const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
  await saveStored(KEYS.ORDERS, upsertBookingInList(globalOrders, updatedBooking));
  const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
  await saveStored(KEYS.BOOKINGS, upsertBookingInList(globalBookings, updatedBooking));

  // Send status update notification to customer
  const statusTitles: Record<string, string> = {
    pending: 'Order Placed 📅',
    accepted: 'Booking Accepted! 🤝',
    rejected: 'Booking Declined ❌',
    on_the_way: 'Provider is On The Way! 🚗',
    in_progress: 'Work In Progress 🧰',
    completed: 'Order Completed! ⭐',
    cancelled: 'Order Cancelled ❌',
  };

  const notificationTitle =
    providerStatusDisplay === 'Rejected'
      ? 'Booking Declined ❌'
      : statusTitles[status] || 'Order Updated';

  const notificationMessage =
    status === 'accepted'
      ? `${target.providerName} has accepted your order for ${target.serviceTitle}. You can now chat directly with your provider.`
      : providerStatusDisplay === 'Rejected'
      ? `${target.providerName} declined the booking request.${reason ? ` Reason: ${reason}` : ''}`
      : `Your order for ${target.serviceTitle} is now marked as ${orderStatusDisplay}.`;

  await addNotification({
    userId: target.customerId,
    title: notificationTitle,
    message: notificationMessage,
    type: 'booking',
    read: false,
    bookingId: target.id,
  });

  // If order was cancelled, notify provider as well
  if (status === 'cancelled') {
    const provNotifyId = target.providerId || 'prov-1';
    const cancelMsg = `${target.customerName || 'Customer'} cancelled the booking for ${target.serviceTitle}.${reason ? ` Reason: ${reason}` : ''}`;
    await addNotification({
      userId: provNotifyId,
      title: 'Booking Cancelled by Customer ❌',
      message: cancelMsg,
      type: 'booking',
      read: false,
      bookingId: target.id,
    });
    if (provNotifyId !== 'prov-1') {
      await addNotification({
        userId: 'prov-1',
        title: 'Booking Cancelled by Customer ❌',
        message: cancelMsg,
        type: 'booking',
        read: false,
        bookingId: target.id,
      });
    }
  }

  return updatedBooking;
}

export async function respondToOrderRequest(
  bookingId: string,
  action: 'accept' | 'reject',
  reason?: string,
  providerId?: string
): Promise<Booking | null> {
  const newStatus: BookingStatus = action === 'accept' ? 'accepted' : 'cancelled';
  const orderStatus = action === 'accept' ? 'Accepted' : 'Rejected';
  const providerStatus = action === 'accept' ? 'Accepted' : 'Rejected';

  return updateBookingStatus(
    bookingId,
    newStatus,
    reason || (action === 'reject' ? 'Declined by service provider' : undefined),
    providerId,
    'provider',
    { orderStatus, providerStatus }
  );
}

export const updateOrderStatus = updateBookingStatus;

export async function updateBookingPayment(
  bookingId: string,
  paymentDetails: {
    paymentStatus: 'paid';
    paymentMethod: 'card';
    stripePaymentId: string;
    stripeChargeId?: string;
    stripeReceiptUrl?: string;
  },
  userId?: string
): Promise<Booking | null> {
  const target = await getBookingById(bookingId, userId);
  if (!target) return null;

  const updated = await updateBookingStatus(
    bookingId,
    target.status,
    undefined,
    userId,
    'customer',
    {
      orderStatus: target.orderStatus,
      providerStatus: target.providerStatus,
      paymentStatus: 'paid',
      paymentMethod: 'card',
      stripePaymentId: paymentDetails.stripePaymentId,
      ...(paymentDetails.stripeChargeId ? { stripeChargeId: paymentDetails.stripeChargeId } : {}),
      ...(paymentDetails.stripeReceiptUrl
        ? { stripeReceiptUrl: paymentDetails.stripeReceiptUrl }
        : {}),
    }
  );

  // Send payment notification to provider
  const provId = target.providerId || 'prov-1';
  await addNotification({
    userId: provId,
    title: 'Customer Payment Received 💳',
    message: `Payment of $${target.totalPrice} for ${target.serviceTitle} was successfully completed via Stripe (Tx: ${paymentDetails.stripePaymentId.slice(0, 14)}...).`,
    type: 'booking',
    read: false,
    bookingId: target.id,
  });

  return updated;
}

// ======================== REVIEWS ========================
export async function getReviews(): Promise<Review[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'reviews')));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
      }
    } catch (e) {
      logFallback('getReviews', e);
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
      logFallback('addReview', e);
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

// ======================== CHAT MESSAGES & REAL-TIME ORDER CHAT ========================
export function subscribeToChatMessages(
  bookingId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: any) => void,
  channelFilter?: string
): Unsubscribe {
  if (!isFirebaseConfigured() || !db || !bookingId) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'chats'), where('bookingId', '==', bookingId));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            bookingId: data.bookingId || bookingId,
            orderId: data.orderId || data.bookingId || bookingId,
            chatId: data.chatId || `chat_${bookingId}`,
            channel: data.channel || 'customer_provider',
            recipientRole: data.recipientRole,
            senderId: data.senderId,
            senderName: data.senderName,
            senderRole: data.senderRole,
            recipientId: data.recipientId,
            text: data.text || data.message || '',
            message: data.message || data.text || '',
            timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
            isRead: data.isRead !== undefined ? data.isRead : data.read || false,
            read: data.read !== undefined ? data.read : data.isRead || false,
          } as ChatMessage;
        });

        const filtered = channelFilter
          ? msgs.filter((m) => m.channel === channelFilter)
          : msgs;

        filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        onUpdate(filtered);
      },
      (error) => {
        console.warn('subscribeToChatMessages notice:', error);
        if (onError) onError(error);
      }
    );

    return unsub;
  } catch (err) {
    console.warn('Failed attaching subscribeToChatMessages listener:', err);
    return () => {};
  }
}

export async function getChatMessages(
  bookingId: string,
  _userId?: string,
  channelFilter?: string
): Promise<ChatMessage[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'chats'), where('bookingId', '==', bookingId));
      const snap = await withTimeout(getDocs(q));
      if (!snap.empty) {
        const msgs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            bookingId: data.bookingId || bookingId,
            orderId: data.orderId || data.bookingId || bookingId,
            chatId: data.chatId || `chat_${bookingId}`,
            channel: data.channel || 'customer_provider',
            recipientRole: data.recipientRole,
            senderId: data.senderId,
            senderName: data.senderName,
            senderRole: data.senderRole,
            recipientId: data.recipientId,
            text: data.text || data.message || '',
            message: data.message || data.text || '',
            timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
            createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
            isRead: data.isRead !== undefined ? data.isRead : data.read || false,
            read: data.read !== undefined ? data.read : data.isRead || false,
          } as ChatMessage;
        });

        const filtered = channelFilter
          ? msgs.filter((m) => m.channel === channelFilter)
          : msgs;

        filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return filtered;
      }
    } catch (e) {
      logFallback('getChatMessages', e);
    }
  }

  const chatsMap = await getStoredOrSeed<Record<string, ChatMessage[]>>(
    KEYS.CHATS,
    INITIAL_CHAT_MESSAGES
  );
  const thread = chatsMap[bookingId] || [];
  return channelFilter ? thread.filter((m) => m.channel === channelFilter) : thread;
}

export async function sendChatMessage(
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'> & {
    orderId?: string;
    chatId?: string;
    channel?: 'customer_provider' | 'admin_customer' | 'admin_provider' | string;
    recipientRole?: UserRole;
  }
): Promise<ChatMessage> {
  const orderId = messageData.orderId || messageData.bookingId;
  const isoTime = new Date().toISOString();
  const channel =
    messageData.channel ||
    (messageData.senderRole === 'admin'
      ? messageData.recipientRole === 'provider'
        ? 'admin_provider'
        : 'admin_customer'
      : 'customer_provider');
  const chatId = messageData.chatId || `chat_${orderId}_${channel}`;

  const newMsg: ChatMessage = {
    ...messageData,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bookingId: orderId,
    orderId,
    chatId,
    channel,
    recipientRole: messageData.recipientRole,
    text: messageData.text,
    message: messageData.text,
    timestamp: isoTime,
    createdAt: isoTime,
    isRead: false,
    read: false,
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'chats', newMsg.id), newMsg);

      await setDoc(
        doc(db, 'support_chats', chatId),
        {
          chatId,
          orderId,
          bookingId: orderId,
          channel,
          recipientRole: newMsg.recipientRole,
          customerId:
            messageData.senderRole === 'customer'
              ? messageData.senderId
              : messageData.recipientId,
          providerId:
            messageData.senderRole === 'provider'
              ? messageData.senderId
              : messageData.recipientId,
          lastMessage: newMsg.text,
          lastMessageTimestamp: isoTime,
          updatedAt: isoTime,
        },
        { merge: true }
      );
    } catch (e) {
      logFallback('sendChatMessage', e);
    }
  }

  const chatsMap = await getStoredOrSeed<Record<string, ChatMessage[]>>(
    KEYS.CHATS,
    INITIAL_CHAT_MESSAGES
  );
  const currentThread = chatsMap[orderId] || [];
  const updatedThread = [...currentThread, newMsg];
  chatsMap[orderId] = updatedThread;
  await saveStored(KEYS.CHATS, chatsMap);

  // Send notification to recipient
  await addNotification({
    userId: newMsg.recipientId,
    title: `Message from ${newMsg.senderName}`,
    message: newMsg.text,
    type: 'chat',
    read: false,
    bookingId: orderId,
  });

  // Ensure cross-delivery so both demo accounts and signed-in accounts receive notifications
  if (newMsg.recipientRole === 'provider' && newMsg.recipientId !== 'prov-1') {
    await addNotification({
      userId: 'prov-1',
      title: `Message from ${newMsg.senderName}`,
      message: newMsg.text,
      type: 'chat',
      read: false,
      bookingId: orderId,
    });
  } else if (newMsg.recipientRole === 'customer' && newMsg.recipientId !== 'cust-demo') {
    await addNotification({
      userId: 'cust-demo',
      title: `Message from ${newMsg.senderName}`,
      message: newMsg.text,
      type: 'chat',
      read: false,
      bookingId: orderId,
    });
  }

  return newMsg;
}

// ======================== NOTIFICATIONS ========================
const READ_NOTIFICATIONS_STORAGE_KEY = '@fixora_read_notifications';

export async function getPersistentReadNotificationIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

export async function addPersistentReadNotificationIds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const current = await getPersistentReadNotificationIds();
    for (const id of ids) {
      if (id) current.add(id);
    }
    await AsyncStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export async function getNotifications(userId?: string): Promise<AppNotification[]> {
  if (!userId) return [];

  const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, userId);
  const readIds = await getPersistentReadNotificationIds();

  // 1. First retrieve all locally cached notifications for this user
  let localList: AppNotification[] = [];
  const cached = await AsyncStorage.getItem(userKey);
  if (cached) {
    try {
      localList = (JSON.parse(cached) as AppNotification[]).filter((n) => n.userId === userId);
    } catch {
      // ignore
    }
  }

  const notifMap = new Map<string, AppNotification>();
  for (const item of localList) {
    notifMap.set(item.id, item);
  }

  // 2. Fetch from Firestore and merge
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q));
      if (!snap.empty) {
        for (const d of snap.docs) {
          const item = { id: d.id, ...d.data() } as AppNotification;
          notifMap.set(item.id, item);
        }
      }

    } catch (e) {
      logFallback('getNotifications', e);
    }
  }

  // 3. If still empty, check initial seed notifications
  if (notifMap.size === 0) {
    if (userId === 'cust-demo') {
      const seed = INITIAL_NOTIFICATIONS.filter((n) => n.userId === 'cust-demo');
      for (const s of seed) {
        notifMap.set(s.id, s);
      }
    } else if (userId === 'prov-1' || userId.toLowerCase().includes('prov') || userId.toLowerCase().includes('david')) {
      // Seed a welcome notification for providers so the panel is never empty
      const provSeed: AppNotification = {
        id: 'notif-prov-welcome',
        userId: userId,
        title: 'Welcome to Fixora Provider Hub 🛠️',
        message: 'Manage incoming booking requests, chat with customers, and track your daily earnings here.',
        type: 'booking',
        read: false,
        createdAt: new Date().toISOString(),
      };
      notifMap.set(provSeed.id, provSeed);
    }
  }

  let merged = Array.from(notifMap.values());
  if (readIds.size > 0) {
    merged = merged.map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
  }
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  await saveStored(userKey, merged);

  return merged;
}

export async function addNotification(
  notifData: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    ...notifData,
    id: `notif-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (e) {
      logFallback('addNotification', e);
    }
  }

  const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, newNotif.userId);
  const existing = await getStoredList<AppNotification>(userKey);
  const updated = [newNotif, ...existing.filter((n) => n.id !== newNotif.id)];
  await saveStored(userKey, updated);
  return newNotif;
}

export async function markNotificationAsRead(id: string, userId?: string): Promise<void> {
  await addPersistentReadNotificationIds([id]);

  if (isFirebaseConfigured() && db) {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      logFallback('markNotificationAsRead', e);
    }
  }

  if (userId) {
    const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, userId);
    const existing = await getStoredList<AppNotification>(userKey);
    const updated = existing.map((n) => (n.id === id ? { ...n, read: true } : n));
    await saveStored(userKey, updated);
  }
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  if (!userId) return;

  const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, userId);
  const existing = await getStoredList<AppNotification>(userKey);
  const allIds = existing.map((n) => n.id);
  const updated = existing.map((n) => ({ ...n, read: true }));
  await saveStored(userKey, updated);

  await addPersistentReadNotificationIds(allIds);

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (!d.data().read) {
          await updateDoc(doc(db, 'notifications', d.id), { read: true });
        }
      }

    } catch (e) {
      logFallback('markAllNotificationsAsRead', e);
    }
  }
}

export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  if (!isFirebaseConfigured() || !db || !userId) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const readIds = await getPersistentReadNotificationIds();
        const firestoreList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);

        const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, userId);
        const existingList = (await getStoredList<AppNotification>(userKey)).filter(
          (n) => n.userId === userId
        );

        const notifMap = new Map<string, AppNotification>();
        for (const n of existingList) notifMap.set(n.id, n);
        for (const n of firestoreList) notifMap.set(n.id, n);

        let list = Array.from(notifMap.values());
        if (readIds.size > 0) {
          list = list.map((n) => (readIds.has(n.id) ? { ...n, read: true } : n));
        }
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        saveStored(userKey, list);
        onUpdate(list);
      },
      (error) => {
        console.warn('subscribeToNotifications notice:', error);
        if (onError) onError(error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Failed attaching subscribeToNotifications listener:', err);
    return () => {};
  }
}

// ======================== ADDRESSES ========================
export async function getAddresses(userId?: string): Promise<Address[]> {
  if (!userId) return [];

  const userKey = getUserStorageKey(KEYS.ADDRESSES, userId);

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'addresses'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q));
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Address);
        await saveStored(userKey, list);
        return list;
      }
    } catch (e) {
      logFallback('getAddresses', e);
    }
  }

  const cached = await AsyncStorage.getItem(userKey);
  if (cached) {
    try {
      return JSON.parse(cached) as Address[];
    } catch {
      // ignore
    }
  }

  if (userId === 'cust-demo') {
    const seed = INITIAL_ADDRESSES.filter((a) => a.userId === 'cust-demo');
    await saveStored(userKey, seed);
    return seed;
  }

  return [];
}

export async function addAddress(addressData: Omit<Address, 'id'>, userId?: string): Promise<Address> {
  const targetUserId = userId || addressData.userId || 'guest_user';

  const newAddr: Address = {
    ...addressData,
    id: `addr-${Date.now()}`,
    userId: targetUserId,
  };

  const userKey = getUserStorageKey(KEYS.ADDRESSES, targetUserId);
  const existing = await getStoredList<Address>(userKey);

  let updated = existing;
  if (newAddr.isDefault) {
    updated = existing.map((a) => ({ ...a, isDefault: false }));
  }
  updated = [newAddr, ...updated];

  const firestoreDb = db;
  if (isFirebaseConfigured() && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'addresses', newAddr.id), newAddr);
      if (newAddr.isDefault) {
        for (const addr of existing) {
          if (addr.isDefault) {
            await updateDoc(doc(firestoreDb, 'addresses', addr.id), { isDefault: false }).catch(() => {});
          }
        }
      }
    } catch (e) {
      logFallback('addAddress', e);
    }
  }

  await saveStored(userKey, updated);
  return newAddr;
}

export async function setDefaultAddress(id: string, userId?: string): Promise<void> {
  if (!userId) return;

  const userKey = getUserStorageKey(KEYS.ADDRESSES, userId);
  const existing = await getStoredList<Address>(userKey);
  const updated = existing.map((a) => ({
    ...a,
    isDefault: a.id === id,
  }));
  await saveStored(userKey, updated);

  if (isFirebaseConfigured() && db) {
    try {
      for (const a of existing) {
        await updateDoc(doc(db, 'addresses', a.id), { isDefault: a.id === id });
      }
    } catch (e) {
      logFallback('setDefaultAddress', e);
    }
  }
}

export async function deleteAddress(id: string, userId?: string): Promise<void> {
  if (!userId) return;

  const userKey = getUserStorageKey(KEYS.ADDRESSES, userId);
  const existing = await getStoredList<Address>(userKey);
  const updated = existing.filter((a) => a.id !== id);
  await saveStored(userKey, updated);

  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, 'addresses', id));
    } catch (e) {
      logFallback('deleteAddress', e);
    }
  }
}

// ======================== FAVORITES ========================
export async function getFavorites(userId?: string): Promise<string[]> {
  if (!userId) return [];

  const userKey = getUserStorageKey(KEYS.FAVORITES, userId);
  try {
    const raw = await AsyncStorage.getItem(userKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading favorites', e);
  }

  if (userId === 'cust-demo') {
    return ['srv-clean-deep', 'srv-ac-servicing'];
  }
  return [];
}

export async function toggleFavorite(serviceId: string, userId?: string): Promise<boolean> {
  if (!userId) return false;

  const userKey = getUserStorageKey(KEYS.FAVORITES, userId);
  const favorites = await getFavorites(userId);
  let updated: string[];
  let isFav = false;
  if (favorites.includes(serviceId)) {
    updated = favorites.filter((id) => id !== serviceId);
    isFav = false;
  } else {
    updated = [...favorites, serviceId];
    isFav = true;
  }
  await AsyncStorage.setItem(userKey, JSON.stringify(updated));
  return isFav;
}

// ======================== COUPONS ========================
export async function getCoupons(): Promise<Coupon[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'coupons')));
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon);
      }
    } catch (e) {
      logFallback('getCoupons', e);
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
      logFallback('addCoupon', e);
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
      logFallback('deleteCoupon', e);
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

