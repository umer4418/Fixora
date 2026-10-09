import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useSafeBack } from '../hooks/use-safe-back';
import { useMarketplace } from '../context/MarketplaceContext';
import { Address } from '../types';
import { Button } from '../components/common/Button';
import { AddressSelectorModal } from '../components/marketplace/AddressSelectorModal';

export default function AddressesScreen() {
  const { addresses, setDefaultAddress, removeAddress } = useMarketplace();
  const goBack = useSafeBack();
  const [modalVisible, setModalVisible] = useState(false);

  const handleDelete = (addr: Address) => {
    Alert.alert('Delete Address', `Delete "${addr.label}: ${addr.street}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeAddress(addr.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={goBack} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Saved Addresses</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Palette.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <View style={styles.cardHeader}>
              <View style={styles.labelRow}>
                <Ionicons
                  name={
                    item.label === 'Home'
                      ? 'home'
                      : item.label === 'Work'
                      ? 'briefcase'
                      : 'location'
                  }
                  size={16}
                  color={Palette.primary}
                />
                <Text style={styles.labelText}>{item.label}</Text>
                {item.isDefault && (
                  <View style={styles.defaultPill}>
                    <Text style={styles.defaultPillText}>DEFAULT</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={18} color={Palette.danger} />
              </TouchableOpacity>
            </View>

            <Text style={styles.streetText}>{item.street}</Text>
            {item.apartment ? <Text style={styles.subText}>{item.apartment}</Text> : null}
            <Text style={styles.subText}>
              {item.city}, {item.state} {item.zipCode}
            </Text>

            {!item.isDefault && (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={() => setDefaultAddress(item.id)}
              >
                <Text style={styles.setDefaultText}>Set as Default</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListFooterComponent={
          <Button
            title="+ Add New Address"
            onPress={() => setModalVisible(true)}
            variant="outline"
            style={{ marginTop: Spacing.two }}
          />
        }
      />

      <AddressSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
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
  addBtn: {
    padding: 4,
  },
  listContent: {
    padding: Spacing.four,
    backgroundColor: Palette.gray50,
    flexGrow: 1,
  },
  addressCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  defaultPill: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.primary,
  },
  streetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  subText: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 2,
  },
  setDefaultBtn: {
    marginTop: 10,
    paddingVertical: 4,
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
});
