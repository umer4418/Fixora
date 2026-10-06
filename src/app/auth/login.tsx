import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

export default function LoginScreen() {
  const { login, loginAsDemoUser, resetPassword } = useAuth();
  const { moderateScale } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email and password');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      // Check target route based on email/role
      const emailLower = email.toLowerCase();
      if (emailLower.includes('admin') || emailLower === 'majeedumer50@gmail.com') {
        router.replace('/admin-portal');
      } else if (emailLower.includes('provider') || emailLower.includes('david')) {
        router.replace('/provider-portal');
      } else {
        router.replace('/(tabs)/home');
      }
    } else {
      Alert.alert('Login Failed', res.error || 'Please check your credentials.');
    }
  };

  const handleQuickLogin = (role: 'customer' | 'provider' | 'admin') => {
    loginAsDemoUser(role);
    if (role === 'admin') {
      router.replace('/admin-portal');
    } else if (role === 'provider') {
      router.replace('/provider-portal');
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleSendResetLink = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Email Required', 'Please enter your registered email address.');
      return;
    }

    setResetLoading(true);
    const res = await resetPassword(resetEmail.trim());
    setResetLoading(false);

    if (res.success) {
      setResetSuccess(true);
    } else {
      Alert.alert('Reset Failed', res.error || 'Failed to send password reset email.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header - Secure & Protected */}
      <View style={styles.topBar}>
        <View style={styles.secureHeaderRow}>
          <View style={styles.lockIconBox}>
            <Ionicons name="lock-closed" size={14} color="#10B981" />
          </View>
          <Text style={styles.topBarTitle}>Fixora Secure Sign In</Text>
        </View>
        <View style={styles.authRequiredBadge}>
          <Text style={styles.authRequiredText}>Login Required</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Ionicons name="sparkles" size={28} color={Palette.white} />
          </View>
          <Text style={[styles.brandTitle, { fontSize: moderateScale(26) }]}>Fixora</Text>
          <Text style={styles.brandSubtitle}>Home Services Marketplace</Text>
        </View>

        {/* Account Access Guide Card */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <Ionicons name="shield-checkmark" size={18} color={Palette.primary} />
            <Text style={styles.guideTitle}>How to Access Fixora</Text>
          </View>
          <Text style={styles.guideDesc}>
            Only verified and authenticated users have access to the app. You can create a new account or tap any test account below to autofill:
          </Text>

          <View style={styles.credentialCardsRow}>
            {/* Customer Credentials */}
            <TouchableOpacity
              style={styles.credCard}
              onPress={() => {
                setEmail('alex.morgan@example.com');
                setPassword('password');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.credRoleRow}>
                <Ionicons name="person" size={13} color={Palette.primary} />
                <Text style={styles.credRoleTitle}>Customer Account</Text>
              </View>
              <Text style={styles.credEmailText}>alex.morgan@example.com</Text>
              <Text style={styles.credPassText}>Password: password</Text>
              <View style={styles.autofillPill}>
                <Text style={styles.autofillPillText}>Tap to Autofill</Text>
              </View>
            </TouchableOpacity>

            {/* Admin Credentials */}
            <TouchableOpacity
              style={[styles.credCard, styles.credCardAdmin]}
              onPress={() => {
                setEmail('majeedumer50@gmail.com');
                setPassword('password');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.credRoleRow}>
                <Ionicons name="shield-checkmark" size={13} color={Palette.danger} />
                <Text style={[styles.credRoleTitle, { color: Palette.danger }]}>Admin Account</Text>
              </View>
              <Text style={styles.credEmailText}>majeedumer50@gmail.com</Text>
              <Text style={styles.credPassText}>Password: password</Text>
              <View style={[styles.autofillPill, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.autofillPillText, { color: Palette.danger }]}>Tap to Autofill</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>Enter your credentials to access your dashboard</Text>

          {/* Email Input */}
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. majeedumer50@gmail.com"
              placeholderTextColor={Palette.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <View style={styles.passwordLabelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity
              onPress={() => {
                setResetEmail(email);
                setResetSuccess(false);
                setForgotModalVisible(true);
              }}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Palette.gray400}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIconBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Palette.gray500}
              />
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.four }}
          />

          {/* Quick Demo Logins Section */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>QUICK ONE-CLICK SIGN IN</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.demoButtonsCol}>
            <TouchableOpacity
              style={styles.demoCustomerBtn}
              onPress={() => handleQuickLogin('customer')}
              activeOpacity={0.8}
            >
              <View style={styles.demoBtnIcon}>
                <Ionicons name="person" size={16} color={Palette.primary} />
              </View>
              <View style={styles.demoBtnTextCol}>
                <Text style={styles.demoBtnTitle}>Customer Portal</Text>
                <Text style={styles.demoBtnSubtitle}>Alex Morgan • Book services & browse</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoAdminBtn}
              onPress={() => handleQuickLogin('admin')}
              activeOpacity={0.8}
            >
              <View style={[styles.demoBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="shield-checkmark" size={16} color={Palette.danger} />
              </View>
              <View style={styles.demoBtnTextCol}>
                <Text style={[styles.demoBtnTitle, { color: Palette.danger }]}>Admin Portal (Web Dashboard)</Text>
                <Text style={styles.demoBtnSubtitle}>Umer Majeed • Control services, coupons & orders</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.danger} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoProviderBtn}
              onPress={() => handleQuickLogin('provider')}
              activeOpacity={0.8}
            >
              <View style={[styles.demoBtnIcon, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="construct" size={16} color={Palette.purple} />
              </View>
              <View style={styles.demoBtnTextCol}>
                <Text style={[styles.demoBtnTitle, { color: Palette.purple }]}>Provider Portal</Text>
                <Text style={styles.demoBtnSubtitle}>David Miller • Manage jobs & earnings</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Palette.purple} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Link: Go to Register */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.footerLink}>Sign Up Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="key-outline" size={24} color={Palette.primary} />
              </View>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your registered email and we&apos;ll send you instructions to reset your password via Firebase.
            </Text>

            {resetSuccess ? (
              <View style={styles.resetSuccessBox}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                <Text style={styles.resetSuccessTitle}>Password Reset Email Sent!</Text>
                <Text style={styles.resetSuccessDesc}>
                  Please check your inbox at <Text style={{ fontWeight: '700' }}>{resetEmail}</Text> for the reset link.
                </Text>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setForgotModalVisible(false)}
                >
                  <Text style={styles.doneBtnText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={Palette.gray400}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                  />
                </View>

                <TouchableOpacity
                  style={styles.resetActionBtn}
                  onPress={handleSendResetLink}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator size="small" color={Palette.white} />
                  ) : (
                    <Text style={styles.resetActionBtnText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setForgotModalVisible(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  secureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.gray900,
  },
  authRequiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  authRequiredText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.primary,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  guideCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guideTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.gray900,
  },
  guideDesc: {
    fontSize: 11.5,
    color: Palette.gray500,
    lineHeight: 16,
    marginBottom: 10,
  },
  credentialCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  credCard: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  credCardAdmin: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  credRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  credRoleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.primary,
  },
  credEmailText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.gray800,
  },
  credPassText: {
    fontSize: 10,
    color: Palette.gray500,
    marginTop: 1,
    marginBottom: 6,
  },
  autofillPill: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  autofillPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Palette.primary,
  },
  brandBox: {
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Shadows.md,
  },
  brandTitle: {
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: Palette.gray500,
    marginTop: 2,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.gray900,
  },
  formSubtitle: {
    fontSize: 12.5,
    color: Palette.gray500,
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray700,
    marginBottom: 4,
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.gray900,
  },
  eyeIconBtn: {
    padding: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.gray400,
    marginHorizontal: 8,
    letterSpacing: 0.5,
  },
  demoButtonsCol: {
    gap: 10,
  },
  demoCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  demoAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  demoProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
  },
  demoBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoBtnTextCol: {
    flex: 1,
  },
  demoBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.primary,
  },
  demoBtnSubtitle: {
    fontSize: 11,
    color: Palette.gray600,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.four,
  },
  footerText: {
    fontSize: 13,
    color: Palette.gray600,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: Palette.gray500,
    marginTop: 4,
    marginBottom: Spacing.three,
    lineHeight: 18,
  },
  resetActionBtn: {
    backgroundColor: Palette.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  resetActionBtnText: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    color: Palette.gray600,
    fontSize: 13,
    fontWeight: '600',
  },
  resetSuccessBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  resetSuccessTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  resetSuccessDesc: {
    fontSize: 12,
    color: Palette.gray600,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  doneBtnText: {
    color: Palette.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
