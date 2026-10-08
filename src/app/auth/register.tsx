import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Button } from '../../components/common/Button';

export default function RegisterScreen() {
  const { register } = useAuth();

  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in Name, Email and Password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    const res = await register(name.trim(), email.trim(), password, role, phone.trim());
    setLoading(false);

    if (res.success) {
      if (role === 'admin') {
        router.replace('/admin-portal');
      } else if (role === 'provider') {
        router.replace('/provider-portal');
      } else {
        router.replace('/(tabs)/home');
      }
    } else {
      Alert.alert('Registration Failed', res.error || 'Could not complete registration.');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/login');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Create Fixora Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Join Fixora Marketplace</Text>
          <Text style={styles.formSubtitle}>
            Select your account type to customize your experience
          </Text>

          {/* Account Type Selector: Customer vs Admin */}
          <Text style={styles.sectionHeaderLabel}>CHOOSE ACCOUNT ROLE</Text>
          <View style={styles.rolePickerRow}>
            {/* Customer Option */}
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'customer' && styles.roleOptionActiveCustomer,
              ]}
              onPress={() => setRole('customer')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.roleIconBox,
                  role === 'customer' && { backgroundColor: Palette.primary },
                ]}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={role === 'customer' ? Palette.white : Palette.gray500}
                />
              </View>
              <Text
                style={[
                  styles.roleOptionTitle,
                  role === 'customer' && { color: Palette.primary },
                ]}
              >
                Customer
              </Text>
              <Text style={styles.roleOptionDesc}>
                Find & book services, track orders & save with coupons
              </Text>
              {role === 'customer' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
                </View>
              )}
            </TouchableOpacity>

            {/* Admin Option */}
            <TouchableOpacity
              style={[
                styles.roleOption,
                role === 'admin' && styles.roleOptionActiveAdmin,
              ]}
              onPress={() => setRole('admin')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.roleIconBox,
                  role === 'admin' && { backgroundColor: Palette.danger },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={role === 'admin' ? Palette.white : Palette.gray500}
                />
              </View>
              <Text
                style={[
                  styles.roleOptionTitle,
                  role === 'admin' && { color: Palette.danger },
                ]}
              >
                Admin
              </Text>
              <Text style={styles.roleOptionDesc}>
                Web portal dashboard, manage services, coupons & orders
              </Text>
              {role === 'admin' && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Palette.danger} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Provider Option Tab */}
          <TouchableOpacity
            style={[
              styles.providerOptionPill,
              role === 'provider' && styles.providerOptionPillActive,
            ]}
            onPress={() => setRole(role === 'provider' ? 'customer' : 'provider')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="construct"
              size={16}
              color={role === 'provider' ? Palette.purple : Palette.gray500}
            />
            <Text
              style={[
                styles.providerOptionText,
                role === 'provider' && { color: Palette.purple, fontWeight: '700' },
              ]}
            >
              {role === 'provider'
                ? 'Selected: Service Provider (Technician/Pro)'
                : 'Want to provide services? Sign up as Service Provider'}
            </Text>
          </TouchableOpacity>

          {/* Form Fields */}
          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Umer Majeed"
              placeholderTextColor={Palette.gray400}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.label}>Email Address *</Text>
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

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={Palette.gray400}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
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

          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Palette.gray400} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={Palette.gray400}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {role === 'admin' && (
            <View style={styles.adminInfoBox}>
              <Ionicons name="information-circle" size={18} color={Palette.danger} />
              <Text style={styles.adminInfoText}>
                Admin accounts have full control over services, bookings, coupon codes, and platform analytics.
              </Text>
            </View>
          )}

          <Button
            title={`Create ${
              role === 'admin' ? 'Admin' : role === 'provider' ? 'Provider' : 'Customer'
            } Account`}
            onPress={handleRegister}
            loading={loading}
            size="lg"
            variant={role === 'admin' ? 'danger' : 'primary'}
            style={{ marginTop: Spacing.four }}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  backBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
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
    marginBottom: Spacing.four,
  },
  sectionHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Palette.gray400,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  roleOptionActiveCustomer: {
    borderColor: Palette.primary,
    backgroundColor: '#EFF6FF',
  },
  roleOptionActiveAdmin: {
    borderColor: Palette.danger,
    backgroundColor: '#FEF2F2',
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  roleOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.gray800,
  },
  roleOptionDesc: {
    fontSize: 10.5,
    color: Palette.gray500,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  providerOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: Spacing.four,
  },
  providerOptionPillActive: {
    borderColor: Palette.purple,
    backgroundColor: '#FAF5FF',
  },
  providerOptionText: {
    fontSize: 11.5,
    color: Palette.gray600,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray700,
    marginBottom: 4,
    marginTop: 10,
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
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.gray900,
  },
  eyeIconBtn: {
    padding: 6,
  },
  adminInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.md,
    padding: 10,
    marginTop: 14,
  },
  adminInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
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
});
