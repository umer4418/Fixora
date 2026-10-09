import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common/Button';
import { AddressSelectorModal } from '../../components/marketplace/AddressSelectorModal';
import { StripePaymentModal } from '../../components/payment/StripePaymentModal';
import { BorderRadius, Palette, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useSafeBack } from '../../hooks/use-safe-back';
import { StripePaymentResult } from '../../services/stripeService';

export default function BookServiceScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const { services, selectedAddress, bookService, coupons, applyCouponCode } = useMarketplace();
  const { user } = useAuth();
  const goBack = useSafeBack();

  const service = useMemo(() => {
    return services.find((s) => s.id === serviceId);
  }, [services, serviceId]);

  // Generate next 7 days for the date selector
  const availableDates = useMemo(() => {
    const list: { label: string; dateStr: string; day: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      list.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName,
        day: monthDay,
        dateStr: iso,
      });
    }
    return list;
  }, []);

  const timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM',
  ];

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<string>(timeSlots[1]);
  const [contactPhone, setContactPhone] = useState<string>(user?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [stripeModalVisible, setStripeModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon state
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  if (!service) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Service Not Found</Text>
          <Button title="Go Back" onPress={goBack} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const serviceFee = 4;
  const taxes = 3;
  const subtotal = service.price;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const totalPrice = Math.max(0, subtotal + serviceFee + taxes - discountAmount);

  const handleApplyCoupon = async (codeToTry?: string) => {
    const code = (codeToTry || couponCodeInput).trim();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    const res = await applyCouponCode(code, subtotal);
    setCouponLoading(false);
    if (res.valid) {
      setAppliedCoupon({
        code: res.coupon?.code || code,
        discount: res.discount,
        message: res.message,
      });
      setCouponCodeInput(res.coupon?.code || code);
      setCouponError('');
    } else {
      setCouponError(res.message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  const handleConfirmBooking = async () => {
    if (!selectedAddress) {
      setAddressModalVisible(true);
      return;
    }

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (paymentMethod === 'card') {
      setStripeModalVisible(true);
      return;
    }

    await executeBookingCreation();
  };

  const executeBookingCreation = async (stripeRes?: StripePaymentResult) => {
    setIsSubmitting(true);
    try {
      const finalContactPhone = contactPhone.trim() || user?.phone || '';
      const isPaid = !!stripeRes && stripeRes.success;
      const created = await bookService({
        userId: user!.id,
        customerId: user!.id,
        customerName: user!.name || user!.email?.split('@')[0] || 'Customer',
        customerPhone: finalContactPhone,
        customerContact: finalContactPhone || user!.email || '',
        customerEmail: user!.email || '',
        providerId: service.providerId,
        providerName: service.providerName,
        providerAvatar: service.providerAvatar,
        serviceId: service.id,
        serviceTitle: service.title,
        serviceName: service.title,
        categoryName: service.categoryName,
        serviceImage: service.imageUrl,
        quantity: 1,
        price: service.price,
        totalPrice,
        totalAmount: totalPrice,
        orderStatus: 'Placed',
        bookingStatus: 'Pending',
        providerStatus: 'Pending',
        items: [
          {
            id: service.id,
            serviceId: service.id,
            title: service.title,
            price: service.price,
            quantity: 1,
            image: service.imageUrl,
          },
        ],
        date: selectedDate,
        bookingDate: selectedDate,
        timeSlot: selectedSlot,
        bookingTime: selectedSlot,
        address: selectedAddress!,
        notes: notes.trim(),
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
        ...(stripeRes?.paymentIntentId ? { stripePaymentId: stripeRes.paymentIntentId } : {}),
        ...(stripeRes?.chargeId ? { stripeChargeId: stripeRes.chargeId } : {}),
        ...(stripeRes?.receiptUrl ? { stripeReceiptUrl: stripeRes.receiptUrl } : {}),
        ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
        ...(discountAmount > 0 ? { discountAmount } : {}),
      });

      // Navigate to booking tracker
      router.replace({
        pathname: '/booking/[id]',
        params: { id: created.id },
      });
    } catch (e: any) {
      Alert.alert('Booking Failed', e?.message || 'Could not place booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={goBack} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Book Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Summary Header */}
        <View style={styles.serviceSummaryCard}>
          <Text style={styles.summaryCategory}>{service.categoryName}</Text>
          <Text style={styles.summaryTitle}>{service.title}</Text>
          <Text style={styles.summaryProvider}>Provider: {service.providerName}</Text>
          <View style={styles.summaryRateRow}>
            <Text style={styles.summaryPrice}>Base Price: ${service.price}</Text>
            <Text style={styles.summaryDuration}>Est: {service.duration}</Text>
          </View>
        </View>

        {/* Step 1: Select Date */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="calendar" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>1. Select Date</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesRow}
          >
            {availableDates.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                  onPress={() => setSelectedDate(item.dateStr)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.dateChipLabel, isSelected && styles.dateChipLabelSelected]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.dateChipDay, isSelected && styles.dateChipDaySelected]}
                  >
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 2: Select Time Slot */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="time" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>2. Select Time Slot</Text>
          </View>

          <View style={styles.slotsGrid}>
            {timeSlots.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                  onPress={() => setSelectedSlot(slot)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}
                  >
                    {slot}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={Palette.white} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Address Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="location" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>3. Service Address</Text>
          </View>

          {selectedAddress ? (
            <TouchableOpacity
              style={styles.addressDisplayCard}
              onPress={() => setAddressModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.addressTextCol}>
                <View style={styles.addressLabelPill}>
                  <Text style={styles.addressLabelPillText}>{selectedAddress.label}</Text>
                </View>
                <Text style={styles.addressStreet}>{selectedAddress.street}</Text>
                {selectedAddress.apartment ? (
                  <Text style={styles.addressCity}>{selectedAddress.apartment}</Text>
                ) : null}
                <Text style={styles.addressCity}>
                  {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zipCode}
                </Text>
              </View>
              <View style={styles.changeAddressBtn}>
                <Text style={styles.changeAddressText}>Change</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.selectAddressPrompt}
              onPress={() => setAddressModalVisible(true)}
            >
              <Ionicons name="add-circle" size={24} color={Palette.primary} />
              <Text style={styles.selectAddressPromptText}>Select or Add Service Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step 4: Contact Phone Number */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="call" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>4. Contact Phone Number</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. +1 (555) 234-5678 (Used for provider arrival updates)"
            placeholderTextColor={Palette.gray400}
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
          />
        </View>

        {/* Step 5: Special Instructions / Notes */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="document-text" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>5. Special Instructions (Optional)</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g. Gate code, pet instructions, specific area to inspect..."
            placeholderTextColor={Palette.gray400}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Step 6: Payment Method */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="card" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>6. Payment Method</Text>
          </View>

          <View style={styles.paymentMethodsCol}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cash' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('cash')}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionLeft}>
                <Ionicons name="cash-outline" size={20} color={Palette.gray700} />
                <View>
                  <Text style={styles.paymentOptionTitle}>Pay After Service (Cash / POS)</Text>
                  <Text style={styles.paymentOptionSub}>Pay directly once the job is completed</Text>
                </View>
              </View>
              <Ionicons
                name={paymentMethod === 'cash' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === 'cash' ? Palette.primary : Palette.gray400}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={styles.stripeCardBadge}>
                  <Ionicons name="card" size={16} color={Palette.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.paymentOptionTitle}>Credit / Debit Card</Text>
                    <View style={styles.stripeTagBadge}>
                      <Text style={styles.stripeTagText}>STRIPE</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentOptionSub}>Pay online securely with Stripe (Visa, MC, Amex)</Text>
                </View>
              </View>
              <Ionicons
                name={paymentMethod === 'card' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={paymentMethod === 'card' ? '#635BFF' : Palette.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 7: Coupons & Promotional Discounts */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="pricetag" size={18} color={Palette.primary} />
            <Text style={styles.sectionHeading}>7. Promo & Coupon Code</Text>
          </View>

          {appliedCoupon ? (
            <View style={styles.appliedCouponCard}>
              <View style={styles.appliedCouponLeft}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                  <Text style={styles.appliedCouponDesc}>{appliedCoupon.message}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code (e.g. FIXORA20)"
                  placeholderTextColor={Palette.gray400}
                  autoCapitalize="characters"
                  value={couponCodeInput}
                  onChangeText={(text) => {
                    setCouponCodeInput(text);
                    setCouponError('');
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.applyCouponBtn,
                    (!couponCodeInput.trim() || couponLoading) && { opacity: 0.6 },
                  ]}
                  onPress={() => handleApplyCoupon()}
                  disabled={!couponCodeInput.trim() || couponLoading}
                >
                  <Text style={styles.applyCouponBtnText}>
                    {couponLoading ? 'Checking...' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>

              {couponError ? (
                <Text style={styles.couponErrorText}>{couponError}</Text>
              ) : null}

              {/* Available Quick Coupons */}
              <View style={styles.availableCouponsWrapper}>
                <Text style={styles.availableCouponsLabel}>AVAILABLE OFFERS:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginTop: 4 }}
                >
                  {coupons
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.couponChip}
                        onPress={() => handleApplyCoupon(c.code)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="gift-outline" size={12} color={Palette.primary} />
                        <Text style={styles.couponChipCode}>{c.code}</Text>
                        <Text style={styles.couponChipPercent}>{c.discountPercent}% OFF</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Bill Summary */}
        <View style={styles.billSummaryCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Service Item Total</Text>
            <Text style={styles.billValue}>${service.price}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Safety & Inspection Fee</Text>
            <Text style={styles.billValue}>${serviceFee}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Surcharges</Text>
            <Text style={styles.billValue}>${taxes}</Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#10B981', fontWeight: '700' }]}>
                Coupon Discount ({appliedCoupon?.code})
              </Text>
              <Text style={[styles.billValue, { color: '#10B981', fontWeight: '700' }]}>
                -${discountAmount}
              </Text>
            </View>
          )}

          <View style={styles.billDivider} />

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total Payable</Text>
            <Text style={styles.billTotalValue}>${totalPrice}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Confirmation Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPriceValue}>${totalPrice}</Text>
        </View>

        <Button
          title={paymentMethod === 'card' ? `Pay $${totalPrice} with Stripe` : 'Confirm & Book'}
          onPress={handleConfirmBooking}
          loading={isSubmitting}
          icon={paymentMethod === 'card' ? 'card' : 'checkmark-done'}
          size="lg"
          style={[styles.confirmBtn, paymentMethod === 'card' && { backgroundColor: '#635BFF' }]}
        />
      </View>

      <AddressSelectorModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
      />

      <StripePaymentModal
        visible={stripeModalVisible}
        onClose={() => setStripeModalVisible(false)}
        amount={totalPrice}
        serviceTitle={service.title}
        customerName={user?.name || ''}
        customerEmail={user?.email || ''}
        onPaymentSuccess={(res) => {
          executeBookingCreation(res);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  navBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  serviceSummaryCard: {
    backgroundColor: Palette.white,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  summaryCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
    marginTop: 2,
  },
  summaryProvider: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 2,
  },
  summaryRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    paddingTop: 6,
  },
  summaryPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  summaryDuration: {
    fontSize: 12,
    color: Palette.gray500,
  },
  sectionCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  datesRow: {
    gap: 8,
    paddingVertical: 4,
  },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
    minWidth: 74,
  },
  dateChipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  dateChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.gray600,
  },
  dateChipLabelSelected: {
    color: Palette.white,
  },
  dateChipDay: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
    marginTop: 2,
  },
  dateChipDaySelected: {
    color: Palette.white,
  },
  slotsGrid: {
    gap: 8,
  },
  slotChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  slotChipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray700,
  },
  slotChipTextSelected: {
    color: Palette.white,
    fontWeight: '700',
  },
  addressDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.primarySoft,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  addressTextCol: {
    flex: 1,
    marginRight: 10,
  },
  addressLabelPill: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  addressLabelPillText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '700',
  },
  addressStreet: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  addressCity: {
    fontSize: 11,
    color: Palette.gray600,
  },
  changeAddressBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  changeAddressText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  selectAddressPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.primary,
    borderRadius: BorderRadius.md,
  },
  selectAddressPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: 13,
    color: Palette.gray900,
    backgroundColor: Palette.white,
    textAlignVertical: 'top',
  },
  paymentMethodsCol: {
    gap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  paymentOptionSelected: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primarySoft,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  paymentOptionSub: {
    fontSize: 11,
    color: Palette.gray500,
  },
  stripeCardBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: '#635BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripeTagBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  stripeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  billSummaryCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.four,
    ...Shadows.sm,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: Spacing.two,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 12,
    color: Palette.gray600,
  },
  billValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray800,
  },
  billDivider: {
    height: 1,
    backgroundColor: Palette.gray200,
    marginVertical: 8,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.gray900,
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.primary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray200,
    ...Shadows.md,
  },
  bottomPriceCol: {},
  bottomPriceLabel: {
    fontSize: 11,
    color: Palette.gray500,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.gray900,
  },
  confirmBtn: {
    flex: 1,
    marginLeft: Spacing.four,
  },
  appliedCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  appliedCouponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  appliedCouponCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  appliedCouponDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  removeCouponBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  removeCouponText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.danger,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Palette.gray900,
    backgroundColor: Palette.gray50,
  },
  applyCouponBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCouponBtnText: {
    color: Palette.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  couponErrorText: {
    color: Palette.danger,
    fontSize: 11.5,
    marginTop: 6,
    fontWeight: '600',
  },
  availableCouponsWrapper: {
    marginTop: 12,
  },
  availableCouponsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.gray400,
    letterSpacing: 0.5,
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  couponChipCode: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.primary,
  },
  couponChipPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.gray800,
  },
});
