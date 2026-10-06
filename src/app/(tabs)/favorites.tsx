import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Header } from '../../components/common/Header';
import { ServiceCard } from '../../components/marketplace/ServiceCard';

export default function FavoritesScreen() {
  const { services, favorites } = useMarketplace();

  const savedServices = useMemo(() => {
    return services.filter((s) => favorites.includes(s.id));
  }, [services, favorites]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Saved Services" showLocation={false} />

      <View style={styles.container}>
        <FlatList
          data={savedServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceCard service={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="heart-outline" size={44} color={Palette.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No Saved Services</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart icon on any service to save it here for fast booking.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/explore')}
              >
                <Text style={styles.exploreBtnText}>Discover Services</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
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
  listContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  exploreBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  exploreBtnText: {
    color: Palette.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
