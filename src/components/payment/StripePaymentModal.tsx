import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import {
  processStripeCardPayment,
  createStripeCheckoutSession,
  openStripeHostedCheckout,
  formatCardNumber,
  formatExpiry,
  detectCardBrand,
  StripePaymentResult,
  STRIPE_PUBLISHABLE_KEY,
} from '../../services/stripeService';

interface StripePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  serviceTitle: string;
  customerName?: string;
  customerEmail?: string;
  bookingId?: string;
  onPaymentSuccess: (result: StripePaymentResult) => void;
}

export const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  visible,
  onClose,
  amount,
  serviceTitle,
  customerName = '',
  customerEmail = '',
  bookingId = '',
  onPaymentSuccess,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState(customerName || 'Test Customer');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLaunchingHosted, setIsLaunchingHosted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<StripePaymentResult | null>(null);

  const cardBrand = detectCardBrand(cardNumber);

  const handleFillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('123');
    setName(customerName || 'Jane Customer');
    setErrorMessage(null);
  };

  const handlePay = async () => {
    setErrorMessage(null);

    const parts = expiry.split('/');
    const expMonth = parts[0] ? parts[0].trim() : '';
    const expYear = parts[1] ? parts[1].trim() : '';

    setIsProcessing(true);
    try {
      const result = await processStripeCardPayment({
        amount,
        currency: 'usd',
        card: {
          number: cardNumber,
          expMonth,
          expYear,
          cvc,
          name,
        },
        customerName: name,
        customerEmail,
        description: `Fixora Order: ${serviceTitle} ($${amount})`,
        metadata: {
          bookingId,
          serviceTitle,
        },
      });

      if (result.success) {
        setSuccessResult(result);
        setTimeout(() => {
          onPaymentSuccess(result);
          handleClose();
        }, 1600);
      } else {
        setErrorMessage(result.error || 'Payment was declined by Stripe.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected payment processing error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithHostedStripe = async () => {
    setIsLaunchingHosted(true);
    setErrorMessage(null);
    try {
      const session = await createStripeCheckoutSession({
        amount,
        serviceTitle,
        customerEmail,
        bookingId,
      });

      if (session.success && session.url) {
        await openStripeHostedCheckout(session.url);
      } else {
        setErrorMessage(session.error || 'Could not open Stripe Checkout.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error opening Stripe Checkout session.');
    } finally {
      setIsLaunchingHosted(false);
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    setSuccessResult(null);
    setIsProcessing(false);
    setIsLaunchingHosted(false);
    onClose();
  };

  const getBrandIcon = () => {
    switch (cardBrand) {
      case 'visa':
        return { label: 'VISA', color: '#1A1F71' };
      case 'mastercard':
        return { label: 'MC', color: '#EB001B' };
      case 'amex':
        return { label: 'AMEX', color: '#006FCF' };
      case 'discover':
        return { label: 'DISC', color: '#FF6000' };
      default:
        return { label: 'CARD', color: Palette.gray500 };
    }
  };

  const brandInfo = getBrandIcon();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.stripeBadge}>
                <Ionicons name="card" size={16} color={Palette.white} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Stripe Secure Payment</Text>
                <View style={styles.securityTag}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={styles.securityText}>256-bit Encrypted • Test Mode</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} disabled={isProcessing}>
              <Ionicons name="close" size={20} color={Palette.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Success State Overlay */}
            {successResult ? (
              <View style={styles.successBox}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark" size={42} color={Palette.white} />
                </View>
                <Text style={styles.successTitle}>Payment Succeeded!</Text>
                <Text style={styles.successAmount}>${amount.toFixed(2)} USD</Text>
                <Text style={styles.successSub}>
                  Processed securely via Stripe ({successResult.brand?.toUpperCase()} •••• {successResult.last4})
                </Text>
                <View style={styles.txIdBadge}>
                  <Text style={styles.txIdText} numberOfLines={1}>
                    ID: {successResult.paymentIntentId}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Order Summary Box */}
                <View style={styles.summaryBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryLabel}>Total Amount to Pay</Text>
                    <Text style={styles.summaryService} numberOfLines={1}>
                      {serviceTitle}
                    </Text>
                  </View>
                  <Text style={styles.summaryPrice}>${amount.toFixed(2)}</Text>
                </View>

                {/* Quick Test Card Chip */}
                <TouchableOpacity
                  style={styles.testCardChip}
                  onPress={handleFillTestCard}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={15} color="#F59E0B" />
                  <Text style={styles.testCardChipText}>
                    Fill Demo Test Card (4242 •••• 4242)
                  </Text>
                </TouchableOpacity>

                {/* Error Banner */}
                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={Palette.danger} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Cardholder Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Jane Doe"
                      placeholderTextColor={Palette.gray400}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Card Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CARD NUMBER</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="card-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="4242 4242 4242 4242"
                      placeholderTextColor={Palette.gray400}
                      keyboardType="numeric"
                      value={cardNumber}
                      maxLength={19}
                      onChangeText={(val) => setCardNumber(formatCardNumber(val))}
                    />
                    <View style={[styles.brandBadge, { backgroundColor: brandInfo.color }]}>
                      <Text style={styles.brandBadgeText}>{brandInfo.label}</Text>
                    </View>
                  </View>
                </View>

                {/* Expiry & CVC Row */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>EXPIRATION</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="calendar-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="MM/YY"
                        placeholderTextColor={Palette.gray400}
                        keyboardType="numeric"
                        maxLength={5}
                        value={expiry}
                        onChangeText={(val) => setExpiry(formatExpiry(val))}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>CVC / CVV</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        placeholderTextColor={Palette.gray400}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                        value={cvc}
                        onChangeText={(val) => setCvc(val.replace(/\D/g, ''))}
                      />
                    </View>
                  </View>
                </View>

                {/* Main Action Buttons */}
                <TouchableOpacity
                  style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
                  onPress={handlePay}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <View style={styles.processingRow}>
                      <ActivityIndicator size="small" color={Palette.white} />
                      <Text style={styles.payButtonText}>Verifying with Stripe...</Text>
                    </View>
                  ) : (
                    <View style={styles.payButtonContent}>
                      <Ionicons name="lock-closed" size={18} color={Palette.white} />
                      <Text style={styles.payButtonText}>Pay ${amount.toFixed(2)} with Stripe</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Secondary Option: Stripe Hosted Checkout Web page */}
                <TouchableOpacity
                  style={styles.hostedBtn}
                  onPress={handlePayWithHostedStripe}
                  disabled={isLaunchingHosted}
                  activeOpacity={0.7}
                >
                  {isLaunchingHosted ? (
                    <ActivityIndicator size="small" color={Palette.primary} />
                  ) : (
                    <Text style={styles.hostedBtnText}>
                      Or Open Official Stripe Checkout Page &rsaquo;
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Footer Security Badges */}
                <View style={styles.footerNote}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={Palette.gray400} />
                  <Text style={styles.footerNoteText}>
                    Transactions processed via Stripe API ({STRIPE_PUBLISHABLE_KEY.slice(0, 12)}...)
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stripeBadge: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    backgroundColor: '#635BFF', // Stripe primary purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  securityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: 12,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  summaryLabel: {
    fontSize: 12,
    color: Palette.gray500,
    fontWeight: '500',
  },
  summaryService: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.gray800,
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.primary,
  },
  testCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  testCardChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: BorderRadius.md,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Palette.danger,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray600,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Palette.gray900,
    fontWeight: '500',
  },
  brandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  brandBadgeText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  payButton: {
    backgroundColor: '#635BFF', // Stripe brand purple
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.md,
  },
  payButtonDisabled: {
    opacity: 0.75,
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hostedBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  hostedBtnText: {
    fontSize: 13,
    color: Palette.primary,
    fontWeight: '600',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  footerNoteText: {
    fontSize: 11,
    color: Palette.gray400,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: 10,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Shadows.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.gray900,
  },
  successAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#059669',
  },
  successSub: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
  },
  txIdBadge: {
    backgroundColor: Palette.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: 8,
    maxWidth: '90%',
  },
  txIdText: {
    fontSize: 11,
    color: Palette.gray600,
    fontWeight: '600',
  },
});
