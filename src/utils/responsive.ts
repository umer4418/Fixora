import { Dimensions, useWindowDimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard mobile baseline dimensions (iPhone 11 / X / 13)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const Breakpoints = {
  phoneSmall: 360,
  phone: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export const scale = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

export const verticalScale = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

export const isSmallScreen = SCREEN_WIDTH < 375;
export const isTablet = SCREEN_WIDTH >= 768;
export const isDesktop = SCREEN_WIDTH >= 1024;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isDeviceTablet = width >= 768;
  const isDeviceDesktop = width >= 1024;
  const isDeviceSmall = width < 375;

  // Max width constraint for customer mobile views on large displays
  const mobileContainerWidth = Math.min(width, 580);
  const adminContainerWidth = Math.min(width - 32, 1280);
  const formCardWidth = Math.min(width - 32, 460);

  return {
    width,
    height,
    isLandscape,
    isTablet: isDeviceTablet,
    isDesktop: isDeviceDesktop,
    isSmallDevice: isDeviceSmall,
    mobileContainerWidth,
    adminContainerWidth,
    formCardWidth,
    scale: (size: number) => (width / BASE_WIDTH) * size,
    verticalScale: (size: number) => (height / BASE_HEIGHT) * size,
    moderateScale: (size: number, factor = 0.5) =>
      size + ((width / BASE_WIDTH) * size - size) * factor,
    getGridColumns: (mobile = 1, tablet = 2, desktop = 3) => {
      if (isDeviceDesktop) return desktop;
      if (isDeviceTablet) return tablet;
      return mobile;
    },
  };
}
