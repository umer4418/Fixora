import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {};

    // Size
    switch (size) {
      case 'sm':
        base = { paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.sm };
        break;
      case 'lg':
        base = { paddingVertical: 14, paddingHorizontal: 24, borderRadius: BorderRadius.md };
        break;
      case 'md':
      default:
        base = { paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.md };
        break;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base = { ...base, backgroundColor: Palette.gray800 };
        break;
      case 'outline':
        base = {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: Palette.primary,
        };
        break;
      case 'danger':
        base = { ...base, backgroundColor: Palette.danger };
        break;
      case 'ghost':
        base = { ...base, backgroundColor: 'transparent' };
        break;
      case 'primary':
      default:
        base = { ...base, backgroundColor: Palette.primary };
        break;
    }

    if (disabled || loading) {
      base = { ...base, opacity: 0.6 };
    }

    return base;
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
        return Palette.primary;
      case 'ghost':
        return Palette.primary;
      case 'primary':
      case 'secondary':
      case 'danger':
      default:
        return Palette.white;
    }
  };

  const textColor = getTextColor();
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.button, getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textColor}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={textColor}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
