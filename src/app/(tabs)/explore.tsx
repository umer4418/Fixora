import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Header } from '../../components/common/Header';
import { ServiceCard } from '../../components/marketplace/ServiceCard';
import { INITIAL_CATEGORIES } from '../../services/seedData';

export default function ExploreScreen() {
  const { categoryId: queryCatId } = useLocalSearchParams<{ categoryId?: string }>();
  const { services, categories } = useMarketplace();

  const displayCategories = categories && categories.length > 0 ? categories : INITIAL_CATEGORIES;

  const [searchQuery, setSearchQuery] = useState('');
  const [prevQueryCatId, setPrevQueryCatId] = useState(queryCatId);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(queryCatId || null);
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [minRating, setMinRating] = useState<number>(0);

  if (queryCatId !== prevQueryCatId) {
    setPrevQueryCatId(queryCatId);
    setSelectedCatId(queryCatId || null);
  }

  const filteredServices = useMemo(() => {
    return services
      .filter((service) => {
        // Category filter
        if (selectedCatId && service.categoryId !== selectedCatId) {
          return false;
        }

        // Search query filter (title, description, providerName, categoryName)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = service.title.toLowerCase().includes(q);
          const matchDesc = service.description.toLowerCase().includes(q);
          const matchProv = service.providerName.toLowerCase().includes(q);
          const matchCat = service.categoryName.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchProv && !matchCat) {
            return false;
          }
        }

        // Rating filter
        if (minRating > 0 && service.rating < minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        return b.rating - a.rating;
      });
  }, [services, selectedCatId, searchQuery, minRating, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCatId(null);
    setMinRating(0);
    setSortBy('rating');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Search & Explore" showLocation={false} />

      <View style={styles.container}>
        {/* Search input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Palette.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search service, category or pro..."
            placeholderTextColor={Palette.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={Palette.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Section Header & Horizontal scroll chips */}
        <View style={styles.categoriesHeaderRow}>
          <View style={styles.categoriesHeaderLeft}>
            <Ionicons name="apps-outline" size={16} color={Palette.primary} />
            <Text style={styles.categoriesSectionTitle}>Service Categories</Text>
          </View>
          {selectedCatId ? (
            <TouchableOpacity onPress={() => setSelectedCatId(null)} style={styles.clearCatBtn}>
              <Text style={styles.clearCatBtnText}>Clear Filter</Text>
              <Ionicons name="close-circle" size={14} color={Palette.danger} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.categoriesCountText}>{displayCategories.length} available</Text>
          )}
        </View>

        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedCatId === null && styles.filterPillActive,
              ]}
              onPress={() => setSelectedCatId(null)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.filterPillIconBox,
                  selectedCatId === null && { backgroundColor: Palette.primaryDark },
                ]}
              >
                <Ionicons
                  name="grid"
                  size={14}
                  color={selectedCatId === null ? Palette.white : Palette.primary}
                />
              </View>
              <Text
                style={[
                  styles.filterPillText,
                  selectedCatId === null && styles.filterPillTextActive,
                ]}
              >
                All Services
              </Text>
            </TouchableOpacity>

            {displayCategories.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              const iconName: any = cat.icon || 'sparkles';
              const catColor = cat.color || Palette.primary;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterPill,
                    isSelected && {
                      backgroundColor: catColor,
                      borderColor: catColor,
                    },
                  ]}
                  onPress={() => setSelectedCatId(isSelected ? null : cat.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.filterPillIconBox,
                      isSelected
                        ? { backgroundColor: 'rgba(255, 255, 255, 0.25)' }
                        : { backgroundColor: `${catColor}15` },
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={14}
                      color={isSelected ? Palette.white : catColor}
                    />
                  </View>
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Sort & Rating filters bar */}
        <View style={styles.sortBar}>
          <Text style={styles.resultsCount}>
            {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} found
          </Text>

          <View style={styles.sortButtonsRow}>
            <TouchableOpacity
              style={[
                styles.sortChip,
                sortBy === 'price_asc' && styles.sortChipActive,
              ]}
              onPress={() => setSortBy(sortBy === 'price_asc' ? 'rating' : 'price_asc')}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === 'price_asc' && styles.sortChipTextActive,
                ]}
              >
                Price ↑
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortChip,
                sortBy === 'price_desc' && styles.sortChipActive,
              ]}
              onPress={() => setSortBy(sortBy === 'price_desc' ? 'rating' : 'price_desc')}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === 'price_desc' && styles.sortChipTextActive,
                ]}
              >
                Price ↓
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortChip,
                minRating === 4.8 && styles.sortChipActive,
              ]}
              onPress={() => setMinRating(minRating === 4.8 ? 0 : 4.8)}
            >
              <Ionicons
                name="star"
                size={12}
                color={minRating === 4.8 ? Palette.white : Palette.star}
              />
              <Text
                style={[
                  styles.sortChipText,
                  minRating === 4.8 && styles.sortChipTextActive,
                ]}
              >
                4.8+
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service listings */}
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceCard service={item} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="search" size={40} color={Palette.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No Services Found</Text>
              <Text style={styles.emptyDesc}>
                We could not find any service matching your search or filters.
              </Text>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
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
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.gray900,
    marginLeft: 8,
  },
  categoriesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: Palette.white,
  },
  categoriesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoriesSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.gray800,
    letterSpacing: 0.2,
  },
  categoriesCountText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.gray400,
  },
  clearCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.full,
  },
  clearCatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.danger,
  },
  categoriesWrapper: {
    paddingVertical: 10,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.four,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  filterPillTextActive: {
    color: Palette.white,
    fontWeight: '800',
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray500,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray300,
  },
  sortChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.gray700,
  },
  sortChipTextActive: {
    color: Palette.white,
  },
  listContainer: {
    padding: Spacing.four,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
  emptyDesc: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  resetBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  resetBtnText: {
    color: Palette.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
