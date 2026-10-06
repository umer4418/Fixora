import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const PortalSwitcher: React.FC = () => {
  const { activeRole, switchPortalRole } = useAuth();

  const handleSwitch = (role: UserRole) => {
    switchPortalRole(role);
    if (role === 'customer') {
      router.replace('/');
    } else if (role === 'provider') {
      router.push('/provider-portal');
    } else if (role === 'admin') {
      router.push('/admin-portal');
    }
  };

  const portals: { role: UserRole; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { role: 'customer', title: 'Customer', icon: 'person', color: Palette.primary },
    { role: 'provider', title: 'Provider', icon: 'construct', color: Palette.purple },
    { role: 'admin', title: 'Admin', icon: 'shield-checkmark', color: Palette.danger },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="swap-horizontal" size={18} color={Palette.primary} />
        <Text style={styles.title}>Switch Experience / Portal</Text>
      </View>
      <Text style={styles.subtitle}>
        Experience all 3 portals of the Fixora ecosystem instantly:
      </Text>

      <View style={styles.buttonsRow}>
        {portals.map((p) => {
          const isActive = activeRole === p.role;
          return (
            <TouchableOpacity
              key={p.role}
              style={[
                styles.portalButton,
                isActive && { borderColor: p.color, backgroundColor: `${p.color}15` },
              ]}
              onPress={() => handleSwitch(p.role)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={p.icon}
                size={18}
                color={isActive ? p.color : Palette.gray500}
              />
              <Text
                style={[
                  styles.portalButtonText,
                  isActive && { color: p.color, fontWeight: '700' },
                ]}
              >
                {p.title}
              </Text>
              {isActive && <View style={[styles.activeDot, { backgroundColor: p.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
    marginVertical: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.gray500,
    marginBottom: Spacing.three,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  portalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    backgroundColor: Palette.gray50,
  },
  portalButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray700,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
