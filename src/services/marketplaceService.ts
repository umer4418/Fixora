import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
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
  UserRole,
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

  let effectiveStatus: BookingStatus = 'pending';
  if (data.status) {
    effectiveStatus = data.status as BookingStatus;
  } else if (data.orderStatus) {
    const lower = String(data.orderStatus).toLowerCase();
    if (lower === 'placed') effectiveStatus = 'pending';
    else if (lower === 'processing') effectiveStatus = 'in_progress';
    else if (lower === 'accepted') effectiveStatus = 'accepted';
    else if (lower === 'on_the_way' || lower === 'on the way') effectiveStatus = 'on_the_way';
    else if (lower === 'completed') effectiveStatus = 'completed';
    else if (lower === 'cancelled') effectiveStatus = 'cancelled';
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
      (snapshot) => {
        const list = snapshot.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Cache locally for offline availability
        const userKey = getUserStorageKey(KEYS.BOOKINGS, userId);
        const ordersUserKey = getUserStorageKey(KEYS.ORDERS, userId);
        saveStored(userKey, list);
        saveStored(ordersUserKey, list);

        onUpdate(list);
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

  if (isFirebaseConfigured() && db) {
    try {
      let ordersList: Booking[] = [];

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

      const snapOrders = await withTimeout(getDocs(qOrders));
      if (!snapOrders.empty) {
        ordersList = snapOrders.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
      } else if (role === 'customer') {
        // Check where('customerId', '==', userId) in 'orders'
        const snapCust = await withTimeout(
          getDocs(query(collection(db, 'orders'), where('customerId', '==', userId)))
        );
        if (!snapCust.empty) {
          ordersList = snapCust.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        }
      }

      // 2. Fallback: check legacy 'bookings' collection if 'orders' returned empty
      if (ordersList.length === 0) {
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
        const snapBookings = await withTimeout(getDocs(qBookings));
        if (!snapBookings.empty) {
          ordersList = snapBookings.docs.map((d) => normalizeOrderDoc(d.id, d.data()));
        }
      }

      if (ordersList.length > 0) {
        ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        await saveStored(userKey, ordersList);
        await saveStored(ordersUserKey, ordersList);
        return ordersList;
      }
    } catch (e) {
      logFallback('getBookings / getOrders', e);
    }
  }

  // Fallback to local storage
  // 1. FOR ADMIN: Always load all device orders from global keys & seed data
  if (role === 'admin') {
    const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
    if (globalOrders.length > 0) {
      return globalOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
    if (globalBookings.length > 0) {
      return globalBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return INITIAL_BOOKINGS.map((b) => normalizeOrderDoc(b.id, b));
  }

  // 2. User-scoped cache check
  const cachedOrders = await AsyncStorage.getItem(ordersUserKey);
  if (cachedOrders) {
    try {
      const parsed = JSON.parse(cachedOrders) as Booking[];
      if (parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }

  const cachedBookings = await AsyncStorage.getItem(userKey);
  if (cachedBookings) {
    try {
      const parsed = JSON.parse(cachedBookings) as Booking[];
      if (parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }

  // 3. If provider, check prov-1 cache, local cache, and global orders, merging with seed
  if (role === 'provider') {
    const userProvOrders = await getStoredList<Booking>(ordersUserKey);
    const userProvBookings = await getStoredList<Booking>(userKey);
    let combined = [...userProvOrders, ...userProvBookings];

    if (userId !== 'prov-1') {
      const p1Orders = await getStoredList<Booking>(getUserStorageKey(KEYS.ORDERS, 'prov-1'));
      const p1Bookings = await getStoredList<Booking>(getUserStorageKey(KEYS.BOOKINGS, 'prov-1'));
      combined = [...combined, ...p1Orders, ...p1Bookings];
    }

    const allDeviceOrders = await getStoredList<Booking>(KEYS.ORDERS);
    const allDeviceBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
    const matchedDevice = [...allDeviceOrders, ...allDeviceBookings].filter(
      (b) => b.providerId === userId || b.providerId === 'prov-1' || userId === 'prov-1'
    );
    combined = [...combined, ...matchedDevice];

    const seed = INITIAL_BOOKINGS.filter((b) => b.providerId === 'prov-1' || b.providerId === userId).map((b) =>
      normalizeOrderDoc(b.id, b)
    );

    const orderMap = new Map<string, Booking>();
    for (const s of seed) {
      orderMap.set(s.id, s);
    }
    // Overwrite seed items with updated status
    for (const item of combined) {
      const existing = orderMap.get(item.id);
      if (
        !existing ||
        new Date(item.updatedAt || item.createdAt).getTime() >=
          new Date(existing.updatedAt || existing.createdAt).getTime()
      ) {
        orderMap.set(item.id, item);
      }
    }

    const finalList = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    await saveStored(ordersUserKey, finalList);
    await saveStored(userKey, finalList);
    return finalList;
  }

  // 4. FOR CUSTOMER: Check global orders on device matching this customer or created on this device
  const custOrders = await getStoredList<Booking>(ordersUserKey);
  const custBookings = await getStoredList<Booking>(userKey);
  let combinedCust = [...custOrders, ...custBookings];

  const allDeviceOrders = await getStoredList<Booking>(KEYS.ORDERS);
  const allDeviceBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
  const matchedCustOrders = [...allDeviceOrders, ...allDeviceBookings].filter(
    (b) => b.userId === userId || b.customerId === userId
  );
  combinedCust = [...combinedCust, ...matchedCustOrders];

  if (userId === 'cust-demo') {
    const seed = INITIAL_BOOKINGS.filter((b) => b.customerId === 'cust-demo').map((b) =>
      normalizeOrderDoc(b.id, b)
    );
    const orderMap = new Map<string, Booking>();
    for (const s of seed) {
      orderMap.set(s.id, s);
    }
    for (const item of combinedCust) {
      const existing = orderMap.get(item.id);
      if (
        !existing ||
        new Date(item.updatedAt || item.createdAt).getTime() >=
          new Date(existing.updatedAt || existing.createdAt).getTime()
      ) {
        orderMap.set(item.id, item);
      }
    }
    const finalList = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    await saveStored(userKey, finalList);
    await saveStored(ordersUserKey, finalList);
    return finalList;
  }

  if (combinedCust.length > 0) {
    const orderMap = new Map<string, Booking>();
    for (const item of combinedCust) {
      orderMap.set(item.id, item);
    }
    const finalList = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    await saveStored(userKey, finalList);
    await saveStored(ordersUserKey, finalList);
    return finalList;
  }

  return [];
}

export const getOrders = getBookings;

export async function getBookingById(
  id: string,
  userId?: string,
  role?: UserRole
): Promise<Booking | undefined> {
  if (isFirebaseConfigured() && db) {
    try {
      // Check 'orders' collection first
      const snapOrder = await withTimeout(getDoc(doc(db, 'orders', id)));
      if (snapOrder.exists()) {
        return normalizeOrderDoc(snapOrder.id, snapOrder.data());
      }

      // Check 'bookings' collection
      const snapBooking = await withTimeout(getDoc(doc(db, 'bookings', id)));
      if (snapBooking.exists()) {
        return normalizeOrderDoc(snapBooking.id, snapBooking.data());
      }
    } catch (e) {
      logFallback('getBookingById', e);
    }
  }

  // Fallback to local storage
  // 1. Check user-scoped orders and bookings
  if (userId) {
    const ordersUserKey = getUserStorageKey(KEYS.ORDERS, userId);
    const localOrders = await getStoredList<Booking>(ordersUserKey);
    const match = localOrders.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
    if (match) return match;

    const userKey = getUserStorageKey(KEYS.BOOKINGS, userId);
    const localList = await getStoredList<Booking>(userKey);
    const localMatch = localList.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
    if (localMatch) return localMatch;
  }

  // 2. Check global orders and bookings
  const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
  const globalMatch = globalOrders.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
  if (globalMatch) return globalMatch;

  const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
  const globalBookingsMatch = globalBookings.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
  if (globalBookingsMatch) return globalBookingsMatch;

  // 3. If provider or demo provider, check 'prov-1' storage
  if (role === 'provider' || userId === 'prov-1') {
    const provOrdersKey = getUserStorageKey(KEYS.ORDERS, 'prov-1');
    const provOrders = await getStoredList<Booking>(provOrdersKey);
    const provOrderMatch = provOrders.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
    if (provOrderMatch) return provOrderMatch;

    const provKey = getUserStorageKey(KEYS.BOOKINGS, 'prov-1');
    const provList = await getStoredList<Booking>(provKey);
    const provMatch = provList.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
    if (provMatch) return provMatch;
  }

  // 4. Check seed bookings as fallback
  const seedMatch = INITIAL_BOOKINGS.find((b) => b.id === id || b.orderId === id || b.bookingId === id);
  if (seedMatch) return normalizeOrderDoc(seedMatch.id, seedMatch);

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
    providerId: bookingData.providerId,
    providerName: bookingData.providerName,
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
      // 1. Save to central 'orders' collection (primary)
      await setDoc(doc(firestoreDb, 'orders', newOrder.id), newOrder);
      // 2. Mirror to 'bookings' collection for backward compatibility
      await setDoc(doc(firestoreDb, 'bookings', newOrder.id), newOrder);
    } catch (e) {
      logFallback('createOrder / createBooking', e);
    }
  }

  // Save to customer's user-scoped storage cache
  const custKey = getUserStorageKey(KEYS.BOOKINGS, newOrder.customerId);
  const ordersCustKey = getUserStorageKey(KEYS.ORDERS, newOrder.customerId);
  const existingCust = await getStoredList<Booking>(custKey);
  const updatedCust = [newOrder, ...existingCust.filter((b) => b.id !== newOrder.id)];
  await saveStored(custKey, updatedCust);
  await saveStored(ordersCustKey, updatedCust);

  // If provider has cache on device, update it too
  if (newOrder.providerId) {
    const provKey = getUserStorageKey(KEYS.BOOKINGS, newOrder.providerId);
    const provOrdersKey = getUserStorageKey(KEYS.ORDERS, newOrder.providerId);
    const existingProv = await getStoredList<Booking>(provKey);
    const updatedProv = [newOrder, ...existingProv.filter((b) => b.id !== newOrder.id)];
    await saveStored(provKey, updatedProv);
    await saveStored(provOrdersKey, updatedProv);

    if (newOrder.providerId !== 'prov-1') {
      const demoProvKey = getUserStorageKey(KEYS.BOOKINGS, 'prov-1');
      const demoProvOrdersKey = getUserStorageKey(KEYS.ORDERS, 'prov-1');
      const existingDemoProv = await getStoredList<Booking>(demoProvKey);
      const updatedDemoProv = [newOrder, ...existingDemoProv.filter((b) => b.id !== newOrder.id)];
      await saveStored(demoProvKey, updatedDemoProv);
      await saveStored(demoProvOrdersKey, updatedDemoProv);
    }
  }

  // Also save to global cache
  const globalOrders = await getStoredList<Booking>(KEYS.ORDERS);
  await saveStored(KEYS.ORDERS, [newOrder, ...globalOrders.filter((b) => b.id !== newOrder.id)]);
  const globalBookings = await getStoredList<Booking>(KEYS.BOOKINGS);
  await saveStored(KEYS.BOOKINGS, [newOrder, ...globalBookings.filter((b) => b.id !== newOrder.id)]);

  // Trigger automated notification to provider
  if (newOrder.providerId) {
    await addNotification({
      userId: newOrder.providerId,
      title: 'New Booking Received 📅',
      message: `New booking received from ${newOrder.customerName} for ${newOrder.serviceTitle} ($${newOrder.totalPrice}) on ${newOrder.date} (${newOrder.timeSlot}).`,
      type: 'booking',
      read: false,
      bookingId: newOrder.id,
    });

    if (newOrder.providerId !== 'prov-1') {
      await addNotification({
        userId: 'prov-1',
        title: 'New Booking Received 📅',
        message: `New booking received from ${newOrder.customerName} for ${newOrder.serviceTitle} ($${newOrder.totalPrice}) on ${newOrder.date} (${newOrder.timeSlot}).`,
        type: 'booking',
        read: false,
        bookingId: newOrder.id,
      });
    }
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
  extraUpdates?: { orderStatus?: string; providerStatus?: string }
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
    updatedAt: new Date().toISOString(),
    ...(reason ? { cancellationReason: reason } : {}),
  };

  if (isFirebaseConfigured() && db) {
    const firestore = db;
    try {
      const updateData = {
        status,
        bookingStatus: orderStatusDisplay,
        orderStatus: orderStatusDisplay,
        providerStatus: providerStatusDisplay,
        updatedAt: updatedBooking.updatedAt,
        ...(reason ? { cancellationReason: reason } : {}),
      };

      // Update in central 'orders' collection
      await updateDoc(doc(firestore, 'orders', bookingId), updateData).catch(async () => {
        await setDoc(doc(firestore, 'orders', bookingId), updatedBooking, { merge: true });
      });

      // Update in 'bookings' collection
      await updateDoc(doc(firestore, 'bookings', bookingId), updateData).catch(async () => {
        await setDoc(doc(firestore, 'bookings', bookingId), updatedBooking, { merge: true });
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
  onError?: (error: any) => void
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

        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        onUpdate(msgs);
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

export async function getChatMessages(bookingId: string, _userId?: string): Promise<ChatMessage[]> {
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
        msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return msgs;
      }
    } catch (e) {
      logFallback('getChatMessages', e);
    }
  }

  const chatsMap = await getStoredOrSeed<Record<string, ChatMessage[]>>(
    KEYS.CHATS,
    INITIAL_CHAT_MESSAGES
  );
  return chatsMap[bookingId] || [];
}

export async function sendChatMessage(
  messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'isRead'> & { orderId?: string; chatId?: string }
): Promise<ChatMessage> {
  const orderId = messageData.orderId || messageData.bookingId;
  const isoTime = new Date().toISOString();
  const newMsg: ChatMessage = {
    ...messageData,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bookingId: orderId,
    orderId,
    chatId: messageData.chatId || `chat_${orderId}`,
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
        doc(db, 'support_chats', `chat_${orderId}`),
        {
          chatId: `chat_${orderId}`,
          orderId,
          bookingId: orderId,
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

  return newMsg;
}

// ======================== NOTIFICATIONS ========================
export async function getNotifications(userId?: string): Promise<AppNotification[]> {
  if (!userId) return [];

  const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, userId);
  let list: AppNotification[] = [];

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q));
      if (!snap.empty) {
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
      }

      // Also check prov-1 notifications if this is a provider account or non-cust-demo
      if (userId !== 'prov-1' && userId !== 'cust-demo') {
        const qProv = query(collection(db, 'notifications'), where('userId', '==', 'prov-1'));
        const snapProv = await withTimeout(getDocs(qProv));
        if (!snapProv.empty) {
          const provList = snapProv.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
          const existingIds = new Set(list.map((n) => n.id));
          for (const p of provList) {
            if (!existingIds.has(p.id)) {
              list.push(p);
            }
          }
        }
      }

      if (list.length > 0) {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        await saveStored(userKey, list);
        return list;
      }
    } catch (e) {
      logFallback('getNotifications', e);
    }
  }

  const cached = await AsyncStorage.getItem(userKey);
  if (cached) {
    try {
      list = JSON.parse(cached) as AppNotification[];
    } catch {
      // ignore
    }
  }

  // Also check prov-1 notifications in local storage
  if (userId !== 'cust-demo') {
    const provKey = getUserStorageKey(KEYS.NOTIFICATIONS, 'prov-1');
    const provCached = await AsyncStorage.getItem(provKey);
    if (provCached) {
      try {
        const provList = JSON.parse(provCached) as AppNotification[];
        const existingIds = new Set(list.map((n) => n.id));
        for (const p of provList) {
          if (!existingIds.has(p.id)) {
            list.push(p);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (list.length > 0) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  if (userId === 'cust-demo') {
    const seed = INITIAL_NOTIFICATIONS.filter((n) => n.userId === 'cust-demo');
    await saveStored(userKey, seed);
    return seed;
  }

  return [];
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
  const updated = existing.map((n) => ({ ...n, read: true }));
  await saveStored(userKey, updated);

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
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const userKey = getUserStorageKey(KEYS.NOTIFICATIONS, userId);
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

