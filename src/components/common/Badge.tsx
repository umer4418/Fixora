import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Palette, BorderRadius } from '../../constants/theme';
import { BookingStatus, UserRole } from '../../types';

interface BadgeProps {
  label?: string;
  status?: BookingStatus;
  role?: UserRole;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'gray';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, status, role, variant, style }) => {
  let text = label || '';
  let bg = Palette.gray100;
  let color = Palette.gray700;

  if (status) {
    switch (status) {
      case 'pending':
        text = text || 'Pending';
        bg = Palette.warningSoft;
        color = '#B45309';
        break;
      case 'accepted':
        text = text || 'Accepted';
        bg = Palette.primarySoft;
        color = Palette.primary;
        break;
      case 'on_the_way':
        text = text || 'On The Way';
        bg = '#E0F2FE';
        color = '#0369A1';
        break;
      case 'in_progress':
        text = text || 'In Progress';
        bg = Palette.purpleSoft;
        color = Palette.purple;
        break;
      case 'completed':
        text = text || 'Completed';
        bg = Palette.accentSoft;
        color = '#047857';
        break;
      case 'cancelled':
        text = text || 'Cancelled';
        bg = Palette.dangerSoft;
        color = Palette.danger;
        break;
    }
  } else if (role) {
    switch (role) {
      case 'customer':
        text = text || 'Customer';
        bg = Palette.primarySoft;
        color = Palette.primary;
        break;
      case 'provider':
        text = text || 'Provider';
        bg = Palette.purpleSoft;
        color = Palette.purple;
        break;
      case 'admin':
        text = text || 'Admin';
        bg = '#FEF2F2';
        color = '#B91C1C';
        break;
    }
  } else if (variant) {
    switch (variant) {
      case 'primary':
        bg = Palette.primarySoft;
        color = Palette.primary;
        break;
      case 'success':
        bg = Palette.accentSoft;
        color = '#047857';
        break;
      case 'warning':
        bg = Palette.warningSoft;
        color = '#B45309';
        break;
      case 'danger':
        bg = Palette.dangerSoft;
        color = Palette.danger;
        break;
      case 'purple':
        bg = Palette.purpleSoft;
        color = Palette.purple;
        break;
      case 'gray':
      default:
        bg = Palette.gray100;
        color = Palette.gray700;
        break;
    }
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
