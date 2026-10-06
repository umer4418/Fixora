import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { BookingStatus, Service, Coupon } from '../../types';

type AdminTab = 'overview' | 'products' | 'orders' | 'coupons' | 'users' | 'reviews';

const SERVICE_IMAGE_PRESETS = [
  { label: 'Cleaning', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80' },
  { label: 'AC Repair', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80' },
  { label: 'Plumbing', url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&auto=format&fit=crop&q=80' },
  { label: 'Electrical', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Painting', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80' },
  { label: 'Handyman', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80' },
];

export default function AdminDashboardScreen() {
  const {
    categories,
    services,
    providers,
    bookings,
    reviews,
    coupons,
    refreshAll,
    createService,
    removeService,
    changeBookingStatus,
    createCoupon,
    removeCoupon,
    verifyProvider,
    removeReview,
  } = useMarketplace();

  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Products Tab State
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOriginalPrice, setNewOriginalPrice] = useState('');
  const [newDuration, setNewDuration] = useState('1-2 hours');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newImageUrl, setNewImageUrl] = useState(SERVICE_IMAGE_PRESETS[0].url);
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // Orders Tab State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Coupons Tab State
  const [addCouponModalVisible, setAddCouponModalVisible] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState('20');
  const [newCouponMinSpend, setNewCouponMinSpend] = useState('40');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponExpiry, setNewCouponExpiry] = useState('2026-12-31');
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  // Metrics
  const totalRevenue = useMemo(() => {
    return bookings.reduce((sum, b) => sum + b.totalPrice, 0) + 12450;
  }, [bookings]);

  const activeOrdersCount = useMemo(() => {
    return bookings.filter(
      (b) => b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress' || b.status === 'on_the_way'
    ).length;
  }, [bookings]);

  // Filtered Products
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (selectedProductCategory !== 'all' && s.categoryId !== selectedProductCategory) {
        return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.categoryName.toLowerCase().includes(q) ||
          s.providerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, selectedProductCategory, productSearch]);

  // Filtered Orders
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (orderStatusFilter !== 'all' && b.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return (
          b.customerName.toLowerCase().includes(q) ||
          b.serviceTitle.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          b.providerName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, orderStatusFilter, orderSearch]);

  // Handlers
  const handleCreateProduct = async () => {
    if (!newTitle.trim() || !newPrice.trim()) {
      Alert.alert('Required Fields', 'Please provide at least a Title and Price.');
      return;
    }

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price number.');
      return;
    }

    const cat = categories.find((c) => c.id === newCategoryId) || categories[0];
    const prov = providers[0];

    setIsSubmittingService(true);
    try {
      await createService({
        title: newTitle.trim(),
        description: newDescription.trim() || `${newTitle} performed by licensed expert professionals.`,
        price: priceNum,
        originalPrice: newOriginalPrice ? parseFloat(newOriginalPrice) : Math.round(priceNum * 1.25),
        duration: newDuration.trim() || '1-2 hours',
        categoryId: cat ? cat.id : 'cat-cleaning',
        categoryName: cat ? cat.name : 'Home Cleaning',
        providerId: prov ? prov.id : 'prov-1',
        providerName: prov ? prov.name : 'David Miller',
        providerAvatar: prov ? prov.avatar : undefined,
        imageUrl: newImageUrl || SERVICE_IMAGE_PRESETS[0].url,
        isActive: true,
        isPopular: true,
      });

      setAddProductModalVisible(false);
      setNewTitle('');
      setNewDescription('');
      setNewPrice('');
      setNewOriginalPrice('');
      Alert.alert('Product Added', `Service "${newTitle}" has been added to the Fixora marketplace!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create service.');
    } finally {
      setIsSubmittingService(false);
    }
  };

  const handleDeleteProduct = (service: Service) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${service.title}" from the marketplace?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeService(service.id);
            Alert.alert('Deleted', 'Service removed from marketplace.');
          },
        },
      ]
    );
  };

  const handleUpdateOrderStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await changeBookingStatus(bookingId, newStatus);
      Alert.alert('Status Updated', `Order status updated to "${newStatus.replace(/_/g, ' ').toUpperCase()}"`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update status');
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCouponCode.trim() || !newCouponPercent.trim()) {
      Alert.alert('Required Fields', 'Please enter a coupon code and discount percentage.');
      return;
    }

    const pct = parseInt(newCouponPercent, 10);
    const minSpend = parseFloat(newCouponMinSpend) || 20;

    setIsSubmittingCoupon(true);
    try {
      await createCoupon({
        code: newCouponCode.trim().toUpperCase(),
        discountPercent: pct,
        minOrderAmount: minSpend,
        description: newCouponDesc.trim() || `${pct}% OFF on Fixora services (Min $${minSpend})`,
        expiryDate: newCouponExpiry || '2026-12-31',
        isActive: true,
      });

      setAddCouponModalVisible(false);
      setNewCouponCode('');
      setNewCouponDesc('');
      Alert.alert('Coupon Created', `Promo Code ${newCouponCode.toUpperCase()} is now live for all customers!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create coupon.');
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to delete coupon code "${coupon.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeCoupon(coupon.id);
            Alert.alert('Coupon Deleted', 'Coupon code has been deactivated and removed.');
          },
        },
      ]
    );
  };

  const getStatusBadgeColor = (status: BookingStatus) => {
    switch (status) {
      case 'completed':
        return { bg: '#DEF7EC', text: '#03543F' };
      case 'in_progress':
        return { bg: '#E1EFFE', text: '#1E429F' };
      case 'on_the_way':
        return { bg: '#F3E8FF', text: '#6B21A8' };
      case 'accepted':
        return { bg: '#FEF08A', text: '#854D0E' };
      case 'cancelled':
        return { bg: '#FDE8E8', text: '#9B1C1C' };
      default:
        return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Web & Mobile Style Header */}
      <View style={styles.topNavbar}>
        <View style={styles.topNavbarInner}>
          <View style={styles.topNavLeft}>
            <View style={styles.adminLogoBox}>
              <Ionicons name="shield-checkmark" size={20} color={Palette.white} />
            </View>
            <View>
              <View style={styles.portalTitleRow}>
                <Text style={styles.topNavTitle}>Fixora Admin Portal</Text>
                <View style={styles.cloudBadge}>
                  <View style={styles.greenPulse} />
                  <Text style={styles.cloudBadgeText}>Firestore Live</Text>
                </View>
              </View>
              <Text style={styles.topNavSub}>
                {user?.name ? `${user.name} • ` : ''}{user?.email || 'majeedumer50@gmail.com'}
              </Text>
            </View>
          </View>

          <View style={styles.topNavRight}>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color={Palette.gray700} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={async () => {
                await logout();
                router.replace('/auth/login');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color={Palette.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Web Portal Navigation Tabs */}
      <View style={styles.tabsBarWrapper}>
        <View style={styles.tabsBarInner}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons
              name={activeTab === 'overview' ? 'grid' : 'grid-outline'}
              size={16}
              color={activeTab === 'overview' ? Palette.primary : Palette.gray600}
            />
            <Text style={[styles.tabItemText, activeTab === 'overview' && styles.tabItemTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'products' && styles.tabItemActive]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons
              name={activeTab === 'products' ? 'construct' : 'construct-outline'}
              size={16}
              color={activeTab === 'products' ? Palette.primary : Palette.gray600}
            />
            <Text style={[styles.tabItemText, activeTab === 'products' && styles.tabItemTextActive]}>
              Products & Services ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Ionicons
              name={activeTab === 'orders' ? 'clipboard' : 'clipboard-outline'}
              size={16}
              color={activeTab === 'orders' ? Palette.primary : Palette.gray600}
            />
            <Text style={[styles.tabItemText, activeTab === 'orders' && styles.tabItemTextActive]}>
              Order Tracking ({bookings.length})
            </Text>
            {activeOrdersCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activeOrdersCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'coupons' && styles.tabItemActive]}
            onPress={() => setActiveTab('coupons')}
          >
            <Ionicons
              name={activeTab === 'coupons' ? 'pricetag' : 'pricetag-outline'}
              size={16}
              color={activeTab === 'coupons' ? Palette.primary : Palette.gray600}
            />
            <Text style={[styles.tabItemText, activeTab === 'coupons' && styles.tabItemTextActive]}>
              Coupon Codes ({coupons.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'users' && styles.tabItemActive]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons
              name={activeTab === 'users' ? 'people' : 'people-outline'}
              size={16}
              color={activeTab === 'users' ? Palette.primary : Palette.gray600}
            />
            <Text style={[styles.tabItemText, activeTab === 'users' && styles.tabItemTextActive]}>
              Users & Providers ({providers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'reviews' && styles.tabItemActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons
              name={activeTab === 'reviews' ? 'star' : 'star-outline'}
              size={16}
              color={activeTab === 'reviews' ? Palette.primary : Palette.gray600}
            />
            <Text style={[styles.tabItemText, activeTab === 'reviews' && styles.tabItemTextActive]}>
              Reviews ({reviews.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </View>
      </View>

      {/* Main Body Content based on active tab */}
      <ScrollView
        style={styles.mainContainer}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeTab === 'overview' && (
          <View>
            {/* KPI Stat Cards Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="cash" size={20} color={Palette.primary} />
                </View>
                <Text style={styles.kpiValue}>${totalRevenue.toLocaleString()}</Text>
                <Text style={styles.kpiLabel}>Total Platform Revenue</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="calendar" size={20} color="#D97706" />
                </View>
                <Text style={styles.kpiValue}>{bookings.length}</Text>
                <Text style={styles.kpiLabel}>Total Customer Orders</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="construct" size={20} color="#10B981" />
                </View>
                <Text style={styles.kpiValue}>{services.length}</Text>
                <Text style={styles.kpiLabel}>Active Services Listed</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="pricetag" size={20} color={Palette.purple} />
                </View>
                <Text style={styles.kpiValue}>{coupons.length}</Text>
                <Text style={styles.kpiLabel}>Active Promo Coupons</Text>
              </View>
            </View>

            {/* Quick Actions Bar */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.cardHeaderTitle}>Quick Control Actions</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => {
                    setActiveTab('products');
                    setAddProductModalVisible(true);
                  }}
                >
                  <Ionicons name="add-circle" size={18} color={Palette.white} />
                  <Text style={styles.quickActionBtnText}>Add Product / Service</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: Palette.purple }]}
                  onPress={() => {
                    setActiveTab('coupons');
                    setAddCouponModalVisible(true);
                  }}
                >
                  <Ionicons name="pricetag" size={18} color={Palette.white} />
                  <Text style={styles.quickActionBtnText}>Add Coupon Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, { backgroundColor: '#D97706' }]}
                  onPress={() => setActiveTab('orders')}
                >
                  <Ionicons name="location" size={18} color={Palette.white} />
                  <Text style={styles.quickActionBtnText}>Track Live Orders</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Orders Overview */}
            <View style={styles.recentOrdersCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Recent Bookings Stream</Text>
                <TouchableOpacity onPress={() => setActiveTab('orders')}>
                  <Text style={styles.cardHeaderAction}>View All Orders →</Text>
                </TouchableOpacity>
              </View>

              {bookings.slice(0, 4).map((b) => {
                const badge = getStatusBadgeColor(b.status);
                return (
                  <View key={b.id} style={styles.recentOrderItem}>
                    <View style={styles.recentOrderLeft}>
                      <Text style={styles.recentOrderService}>{b.serviceTitle}</Text>
                      <Text style={styles.recentOrderCustomer}>
                        Customer: {b.customerName} • {b.date}
                      </Text>
                    </View>
                    <View style={styles.recentOrderRight}>
                      <Text style={styles.recentOrderPrice}>${b.totalPrice}</Text>
                      <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusPillText, { color: badge.text }]}>
                          {b.status.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ===================== TAB 2: PRODUCTS & SERVICES ===================== */}
        {activeTab === 'products' && (
          <View>
            {/* Top Toolbar */}
            <View style={styles.toolbarRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={Palette.gray400} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products or services..."
                  placeholderTextColor={Palette.gray400}
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
              </View>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setAddProductModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={Palette.white} />
                <Text style={styles.addBtnText}>Add Product</Text>
              </TouchableOpacity>
            </View>

            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.catFilterPill,
                  selectedProductCategory === 'all' && styles.catFilterPillActive,
                ]}
                onPress={() => setSelectedProductCategory('all')}
              >
                <Text
                  style={[
                    styles.catFilterPillText,
                    selectedProductCategory === 'all' && styles.catFilterPillTextActive,
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catFilterPill,
                    selectedProductCategory === cat.id && styles.catFilterPillActive,
                  ]}
                  onPress={() => setSelectedProductCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.catFilterPillText,
                      selectedProductCategory === cat.id && styles.catFilterPillTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Products List */}
            <View style={styles.productsGrid}>
              {filteredServices.map((item) => (
                <View key={item.id} style={styles.productCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <View style={styles.productHeaderRow}>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{item.categoryName}</Text>
                      </View>
                      <Text style={styles.productPrice}>${item.price}</Text>
                    </View>

                    <Text style={styles.productTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={styles.productProvider} numberOfLines={1}>
                      Provider: {item.providerName}
                    </Text>

                    <View style={styles.productMetaRow}>
                      <Text style={styles.productMetaText}>⏱ {item.duration}</Text>
                      <Text style={styles.productMetaText}>★ {item.rating} ({item.reviewsCount})</Text>
                    </View>

                    {/* Actions: Delete Product */}
                    <View style={styles.productActionsRow}>
                      <TouchableOpacity
                        style={styles.deleteProductBtn}
                        onPress={() => handleDeleteProduct(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color={Palette.danger} />
                        <Text style={styles.deleteProductBtnText}>Delete Product</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ===================== TAB 3: ORDER TRACKING ===================== */}
        {activeTab === 'orders' && (
          <View>
            {/* Orders Search & Filter */}
            <View style={styles.toolbarRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={Palette.gray400} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by customer, service or order ID..."
                  placeholderTextColor={Palette.gray400}
                  value={orderSearch}
                  onChangeText={setOrderSearch}
                />
              </View>
            </View>

            {/* Status Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsScroll}
            >
              {['all', 'pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'].map(
                (status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.catFilterPill,
                      orderStatusFilter === status && styles.catFilterPillActive,
                    ]}
                    onPress={() => setOrderStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.catFilterPillText,
                        orderStatusFilter === status && styles.catFilterPillTextActive,
                      ]}
                    >
                      {status === 'all'
                        ? 'All Orders'
                        : status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            {/* Orders List */}
            <View style={styles.ordersList}>
              {filteredBookings.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="clipboard-outline" size={40} color={Palette.gray400} />
                  <Text style={styles.emptyTitle}>No orders match the filter</Text>
                </View>
              ) : (
                filteredBookings.map((b) => {
                  const badge = getStatusBadgeColor(b.status);
                  return (
                    <View key={b.id} style={styles.orderCard}>
                      {/* Order Header */}
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderIdText}>Order #{b.id}</Text>
                          <Text style={styles.orderDateText}>{b.date} • {b.timeSlot}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusPillText, { color: badge.text }]}>
                            {b.status.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Service Details */}
                      <Text style={styles.orderServiceTitle}>{b.serviceTitle}</Text>
                      <Text style={styles.orderCategory}>Category: {b.categoryName}</Text>

                      {/* Customer & Address Details */}
                      <View style={styles.orderDetailBox}>
                        <View style={styles.orderDetailRow}>
                          <Ionicons name="person-outline" size={14} color={Palette.gray600} />
                          <Text style={styles.orderDetailText}>
                            {b.customerName} {b.customerPhone ? `(${b.customerPhone})` : ''}
                          </Text>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Ionicons name="location-outline" size={14} color={Palette.gray600} />
                          <Text style={styles.orderDetailText} numberOfLines={1}>
                            {b.address.street}, {b.address.city}
                          </Text>
                        </View>
                        <View style={styles.orderDetailRow}>
                          <Ionicons name="construct-outline" size={14} color={Palette.gray600} />
                          <Text style={styles.orderDetailText}>Provider: {b.providerName}</Text>
                        </View>
                      </View>

                      {/* Pricing & Coupon */}
                      <View style={styles.orderPriceRow}>
                        <View>
                          <Text style={styles.orderPriceLabel}>Total Amount:</Text>
                          <Text style={styles.orderPriceValue}>${b.totalPrice}</Text>
                        </View>
                        {b.couponCode ? (
                          <View style={styles.orderCouponAppliedBadge}>
                            <Ionicons name="pricetag" size={12} color="#059669" />
                            <Text style={styles.orderCouponAppliedText}>
                              Coupon: {b.couponCode} (-${b.discountAmount || 0})
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Realtime Status Advancer Controls */}
                      <View style={styles.orderActionsContainer}>
                        <Text style={styles.orderActionsLabel}>UPDATE STATUS:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {b.status !== 'accepted' && b.status !== 'completed' && (
                            <TouchableOpacity
                              style={[styles.statusActionBtn, { backgroundColor: '#FEF08A' }]}
                              onPress={() => handleUpdateOrderStatus(b.id, 'accepted')}
                            >
                              <Text style={[styles.statusActionText, { color: '#854D0E' }]}>Accept</Text>
                            </TouchableOpacity>
                          )}

                          {b.status !== 'on_the_way' && b.status !== 'completed' && (
                            <TouchableOpacity
                              style={[styles.statusActionBtn, { backgroundColor: '#F3E8FF' }]}
                              onPress={() => handleUpdateOrderStatus(b.id, 'on_the_way')}
                            >
                              <Text style={[styles.statusActionText, { color: '#6B21A8' }]}>On The Way</Text>
                            </TouchableOpacity>
                          )}

                          {b.status !== 'in_progress' && b.status !== 'completed' && (
                            <TouchableOpacity
                              style={[styles.statusActionBtn, { backgroundColor: '#DBEAFE' }]}
                              onPress={() => handleUpdateOrderStatus(b.id, 'in_progress')}
                            >
                              <Text style={[styles.statusActionText, { color: '#1E40AF' }]}>In Progress</Text>
                            </TouchableOpacity>
                          )}

                          {b.status !== 'completed' && (
                            <TouchableOpacity
                              style={[styles.statusActionBtn, { backgroundColor: '#DEF7EC' }]}
                              onPress={() => handleUpdateOrderStatus(b.id, 'completed')}
                            >
                              <Text style={[styles.statusActionText, { color: '#03543F' }]}>Complete</Text>
                            </TouchableOpacity>
                          )}

                          {b.status !== 'cancelled' && (
                            <TouchableOpacity
                              style={[styles.statusActionBtn, { backgroundColor: '#FEE2E2' }]}
                              onPress={() => handleUpdateOrderStatus(b.id, 'cancelled')}
                            >
                              <Text style={[styles.statusActionText, { color: '#991B1B' }]}>Cancel</Text>
                            </TouchableOpacity>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ===================== TAB 4: COUPON CODES ===================== */}
        {activeTab === 'coupons' && (
          <View>
            <View style={styles.toolbarRow}>
              <View>
                <Text style={styles.sectionHeaderMainTitle}>Promotional Coupon Codes</Text>
                <Text style={styles.sectionHeaderMainSub}>
                  Customers can apply these codes during checkout
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: Palette.purple }]}
                onPress={() => setAddCouponModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={Palette.white} />
                <Text style={styles.addBtnText}>Create Coupon</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.couponsGrid}>
              {coupons.map((coupon) => (
                <View key={coupon.id} style={styles.couponCard}>
                  <View style={styles.couponCardHeader}>
                    <View style={styles.couponCodeBadge}>
                      <Ionicons name="pricetag" size={16} color={Palette.white} />
                      <Text style={styles.couponCodeText}>{coupon.code}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteCoupon(coupon)}
                      style={styles.deleteCouponBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.couponDiscountTitle}>
                    {coupon.discountPercent}% Instant Discount
                  </Text>
                  <Text style={styles.couponDescription}>{coupon.description}</Text>

                  <View style={styles.couponMetaRow}>
                    <View style={styles.couponMetaItem}>
                      <Text style={styles.couponMetaLabel}>MIN SPEND</Text>
                      <Text style={styles.couponMetaValue}>${coupon.minOrderAmount}</Text>
                    </View>
                    <View style={styles.couponMetaItem}>
                      <Text style={styles.couponMetaLabel}>EXPIRES</Text>
                      <Text style={styles.couponMetaValue}>{coupon.expiryDate}</Text>
                    </View>
                    <View style={styles.couponMetaItem}>
                      <Text style={styles.couponMetaLabel}>USAGE</Text>
                      <Text style={styles.couponMetaValue}>{coupon.usageCount || 0} used</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ===================== TAB 5: USERS & PROVIDERS ===================== */}
        {activeTab === 'users' && (
          <View>
            <Text style={styles.sectionHeaderMainTitle}>Service Providers & Verified Professionals</Text>
            <View style={styles.providersList}>
              {providers.map((p) => (
                <View key={p.id} style={styles.userCard}>
                  <Image
                    source={{
                      uri: p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                    }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfoCol}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userNameText}>{p.name}</Text>
                      {p.isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      )}
                    </View>
                    <Text style={styles.userEmailText}>{p.email}</Text>
                    <Text style={styles.userPhoneText}>📞 {p.phone || 'No phone'}</Text>
                    <Text style={styles.userEarningsText}>Earnings: ${p.earnings || 0}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.verifyToggleBtn,
                      p.isVerified && styles.verifyToggleBtnActive,
                    ]}
                    onPress={() => verifyProvider(p.id, !p.isVerified)}
                  >
                    <Text
                      style={[
                        styles.verifyToggleText,
                        p.isVerified && styles.verifyToggleTextActive,
                      ]}
                    >
                      {p.isVerified ? 'Verified Pro' : 'Mark Verified'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ===================== TAB 6: REVIEWS ===================== */}
        {activeTab === 'reviews' && (
          <View>
            <Text style={styles.sectionHeaderMainTitle}>Customer Reviews & Moderation</Text>
            <View style={styles.reviewsList}>
              {reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewCustomerName}>{rev.customerName}</Text>
                      <Text style={styles.reviewServiceTitle}>{rev.serviceTitle || 'Home Service'}</Text>
                    </View>
                    <View style={styles.reviewRatingRow}>
                      <Text style={styles.reviewRatingNumber}>★ {rev.rating}.0</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>&ldquo;{rev.comment}&rdquo;</Text>
                  <View style={styles.reviewFooter}>
                    <Text style={styles.reviewDate}>
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeReview(rev.id)}
                      style={styles.deleteReviewBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color={Palette.danger} />
                      <Text style={styles.deleteReviewBtnText}>Delete Review</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ===================== MODAL: ADD PRODUCT / SERVICE ===================== */}
      <Modal
        visible={addProductModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddProductModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Service / Product</Text>
              <TouchableOpacity onPress={() => setAddProductModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={styles.inputLabel}>Service Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Master Bathroom Leak Repair"
                placeholderTextColor={Palette.gray400}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <View style={styles.twoInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 55"
                    placeholderTextColor={Palette.gray400}
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Original Price ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 75"
                    placeholderTextColor={Palette.gray400}
                    keyboardType="numeric"
                    value={newOriginalPrice}
                    onChangeText={setNewOriginalPrice}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 1-2 hours"
                placeholderTextColor={Palette.gray400}
                value={newDuration}
                onChangeText={setNewDuration}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalPresetPill,
                      newCategoryId === c.id && styles.modalPresetPillActive,
                    ]}
                    onPress={() => setNewCategoryId(c.id)}
                  >
                    <Text
                      style={[
                        styles.modalPresetPillText,
                        newCategoryId === c.id && styles.modalPresetPillTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Image Preset / URL</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {SERVICE_IMAGE_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.modalPresetPill,
                      newImageUrl === preset.url && styles.modalPresetPillActive,
                    ]}
                    onPress={() => setNewImageUrl(preset.url)}
                  >
                    <Text
                      style={[
                        styles.modalPresetPillText,
                        newImageUrl === preset.url && styles.modalPresetPillTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Comprehensive service details..."
                placeholderTextColor={Palette.gray400}
                multiline
                numberOfLines={3}
                value={newDescription}
                onChangeText={setNewDescription}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleCreateProduct}
              disabled={isSubmittingService}
            >
              <Text style={styles.submitModalBtnText}>
                {isSubmittingService ? 'Publishing...' : 'Save & Publish Service'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================== MODAL: ADD COUPON CODE ===================== */}
      <Modal
        visible={addCouponModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddCouponModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Coupon Code</Text>
              <TouchableOpacity onPress={() => setAddCouponModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Coupon Code (e.g. FLASH30) *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. FIXORA25"
              placeholderTextColor={Palette.gray400}
              autoCapitalize="characters"
              value={newCouponCode}
              onChangeText={setNewCouponCode}
            />

            <View style={styles.twoInputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Discount (%) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 25"
                  placeholderTextColor={Palette.gray400}
                  keyboardType="numeric"
                  value={newCouponPercent}
                  onChangeText={setNewCouponPercent}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Min Spend ($)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 40"
                  placeholderTextColor={Palette.gray400}
                  keyboardType="numeric"
                  value={newCouponMinSpend}
                  onChangeText={setNewCouponMinSpend}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="2026-12-31"
              placeholderTextColor={Palette.gray400}
              value={newCouponExpiry}
              onChangeText={setNewCouponExpiry}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 25% OFF on all repair & cleaning services"
              placeholderTextColor={Palette.gray400}
              value={newCouponDesc}
              onChangeText={setNewCouponDesc}
            />

            <TouchableOpacity
              style={[styles.submitModalBtn, { backgroundColor: Palette.purple }]}
              onPress={handleCreateCoupon}
              disabled={isSubmittingCoupon}
            >
              <Text style={styles.submitModalBtnText}>
                {isSubmittingCoupon ? 'Creating...' : 'Activate Coupon Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topNavbar: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  topNavbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  cloudBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
  },
  topNavSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  topNavRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  customerViewBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#60A5FA',
  },
  refreshBtn: {
    backgroundColor: '#1E293B',
    padding: 6,
    borderRadius: BorderRadius.md,
  },
  tabsBarWrapper: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabsBarInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  tabsScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabItemTextActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: Palette.danger,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeText: {
    color: Palette.white,
    fontSize: 9,
    fontWeight: '800',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  quickActionsCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Shadows.sm,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
  },
  quickActionBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  recentOrdersCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderAction: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  recentOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentOrderLeft: {
    flex: 1,
  },
  recentOrderService: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  recentOrderCustomer: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  recentOrderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recentOrderPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    marginLeft: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
  },
  addBtnText: {
    color: Palette.white,
    fontSize: 12.5,
    fontWeight: '800',
  },
  categoryPillsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  catFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  catFilterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  catFilterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  catFilterPillTextActive: {
    color: Palette.white,
    fontWeight: '800',
  },
  productsGrid: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  productImage: {
    width: 100,
    height: '100%',
    minHeight: 120,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  categoryTagText: {
    color: Palette.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  productProvider: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  productMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  productMetaText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  productActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  deleteProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteProductBtnText: {
    color: Palette.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  ordersList: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderDateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  orderServiceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderCategory: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  orderDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: 10,
    gap: 4,
    marginBottom: 10,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  orderPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginBottom: 10,
  },
  orderPriceLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  orderPriceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  orderCouponAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  orderCouponAppliedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  orderActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  orderActionsLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statusActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
  },
  statusActionText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  sectionHeaderMainTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionHeaderMainSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  couponsGrid: {
    gap: 12,
    marginTop: 12,
  },
  couponCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  couponCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
  },
  couponCodeText: {
    color: Palette.white,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  deleteCouponBtn: {
    padding: 6,
  },
  couponDiscountTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  couponDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  couponMetaRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: 8,
    justifyContent: 'space-between',
  },
  couponMetaItem: {
    alignItems: 'center',
  },
  couponMetaLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '800',
  },
  couponMetaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  providersList: {
    gap: 10,
    marginTop: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  userInfoCol: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmailText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  userPhoneText: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  userEarningsText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    marginTop: 2,
  },
  verifyToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  verifyToggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  verifyToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  verifyToggleTextActive: {
    color: '#059669',
  },
  reviewsList: {
    gap: 10,
    marginTop: 12,
  },
  reviewCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewCustomerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewServiceTitle: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
  },
  reviewRatingRow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  reviewRatingNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  reviewComment: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  reviewDate: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  deleteReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteReviewBtnText: {
    fontSize: 11,
    color: Palette.danger,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: 18,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPresetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    marginRight: 6,
  },
  modalPresetPillActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primary,
  },
  modalPresetPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  modalPresetPillTextActive: {
    color: Palette.white,
    fontWeight: '700',
  },
  submitModalBtn: {
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitModalBtnText: {
    color: Palette.white,
    fontSize: 13.5,
    fontWeight: '800',
  },
});
