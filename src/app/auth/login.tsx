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
  const { login, resetPassword } = useAuth();
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
      const emailLower = email.trim().toLowerCase();
      const role =
        res.role ||
        (emailLower.includes('admin') || emailLower === 'majeedumer50@gmail.com'
          ? 'admin'
          : emailLower.includes('provider') || emailLower.includes('david')
          ? 'provider'
          : 'customer');

      if (role === 'admin') {
        router.replace('/admin-portal');
      } else if (role === 'provider') {
        router.replace('/provider-portal');
      } else {
        router.replace('/(tabs)/home');
      }
    } else {
      Alert.alert('Login Failed', res.error || 'Please check your credentials.');
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

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSubtitle}>Enter your credentials to access your account</Text>

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
