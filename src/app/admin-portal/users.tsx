import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { User } from '../../types';

export default function AdminUsersScreen() {
  const { providers, bookings, verifyProvider } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'providers' | 'customers'>('providers');
  const [search, setSearch] = useState('');

  // Generate customer list from unique bookings or sample list
  const customers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string; phone?: string; bookingsCount: number }>();

    // Initial demo customer
    map.set('cust-demo', {
      id: 'cust-demo',
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 987-6543',
      bookingsCount: 0,
    });

    bookings.forEach((b) => {
      const existing = map.get(b.customerId);
      if (existing) {
        existing.bookingsCount += 1;
      } else {
        map.set(b.customerId, {
          id: b.customerId,
          name: b.customerName,
          email: b.customerEmail || `${b.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: b.customerPhone || '+1 (555) 000-0000',
          bookingsCount: 1,
        });
      }
    });

    return Array.from(map.values());
  }, [bookings]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });
  }, [providers, search]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q));
    });
  }, [customers, search]);

  const handleToggleVerify = (provider: User) => {
    const nextVal = !provider.isVerified;
    verifyProvider(provider.id, nextVal);
    Alert.alert(
      'Verification Updated',
      `${provider.name} is now ${nextVal ? 'VERIFIED' : 'UNVERIFIED'}.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Manage Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.container}>
        {/* Tab switch */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'providers' && styles.tabBtnActive]}
            onPress={() => setActiveTab('providers')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'providers' && styles.tabBtnTextActive,
              ]}
            >
              Providers ({providers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'customers' && styles.tabBtnActive]}
            onPress={() => setActiveTab('customers')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'customers' && styles.tabBtnTextActive,
              ]}
            >
              Customers ({customers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Palette.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor={Palette.gray400}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {activeTab === 'providers' ? (
          <FlatList
            data={filteredProviders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
                  <View style={styles.userTextInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{item.name}</Text>
                      {item.isVerified && (
                        <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
                      )}
                    </View>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userMeta}>
                      ★ {item.rating || 5.0} • ${item.hourlyRate || 40}/hr • {item.availabilityStatus}
                    </Text>
                  </View>
                </View>

                <View style={styles.providerActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.verifyBtn,
                      item.isVerified ? styles.unverifyBtn : styles.verifyBtnActive,
                    ]}
                    onPress={() => handleToggleVerify(item)}
                  >
                    <Ionicons
                      name={item.isVerified ? 'close-circle' : 'checkmark-circle'}
                      size={16}
                      color={item.isVerified ? Palette.danger : Palette.accent}
                    />
                    <Text
                      style={[
                        styles.verifyBtnText,
                        { color: item.isVerified ? Palette.danger : Palette.accent },
                      ]}
                    >
                      {item.isVerified ? 'Revoke Verification' : 'Verify Provider'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <View style={styles.custAvatar}>
                    <Ionicons name="person" size={22} color={Palette.gray600} />
                  </View>
                  <View style={styles.userTextInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userMeta}>
                      📞 {item.phone} • {item.bookingsCount} orders placed
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  navBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Palette.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray600,
  },
  tabBtnTextActive: {
    color: Palette.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.gray900,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  userCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  custAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userTextInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  userEmail: {
    fontSize: 11,
    color: Palette.gray500,
  },
  userMeta: {
    fontSize: 11,
    color: Palette.gray600,
    marginTop: 2,
  },
  providerActionRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    paddingTop: 8,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  verifyBtnActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentSoft,
  },
  unverifyBtn: {
    borderColor: Palette.dangerSoft,
    backgroundColor: '#FEF2F2',
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
