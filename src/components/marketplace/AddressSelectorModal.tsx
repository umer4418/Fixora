import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Spacing } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Address } from '../../types';
import { Button } from '../common/Button';

interface AddressSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { addresses, selectedAddress, setSelectedAddress, addAddress } = useMarketplace();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [street, setStreet] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  const handleSelect = (addr: Address) => {
    setSelectedAddress(addr);
    onClose();
  };

  const handleSaveNewAddress = async () => {
    if (!street.trim() || !city.trim()) {
      alert('Please fill in at least Street address and City');
      return;
    }

    const created = await addAddress({
      label,
      street: street.trim(),
      apartment: apartment.trim(),
      city: city.trim(),
      state: state.trim() || 'IL',
      zipCode: zipCode.trim(),
      isDefault: addresses.length === 0,
    });

    setSelectedAddress(created);
    setIsAddingNew(false);
    setStreet('');
    setApartment('');
    setCity('');
    setZipCode('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="location" size={20} color={Palette.primary} />
              <Text style={styles.headerTitle}>
                {isAddingNew ? 'Add New Address' : 'Select Service Address'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Palette.gray600} />
            </TouchableOpacity>
          </View>

          {!isAddingNew ? (
            <ScrollView style={styles.scrollList} contentContainerStyle={{ paddingBottom: 20 }}>
              {addresses.map((addr) => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressItem,
                      isSelected && styles.addressItemSelected,
                    ]}
                    onPress={() => handleSelect(addr)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressLeft}>
                      <View
                        style={[
                          styles.labelBadge,
                          isSelected && { backgroundColor: Palette.primary },
                        ]}
                      >
                        <Ionicons
                          name={
                            addr.label === 'Home'
                              ? 'home'
                              : addr.label === 'Work'
                              ? 'briefcase'
                              : 'location'
                          }
                          size={14}
                          color={isSelected ? Palette.white : Palette.gray700}
                        />
                        <Text
                          style={[
                            styles.labelText,
                            isSelected && { color: Palette.white },
                          ]}
                        >
                          {addr.label}
                        </Text>
                      </View>

                      <Text style={styles.streetText}>{addr.street}</Text>
                      {addr.apartment && (
                        <Text style={styles.subText}>{addr.apartment}</Text>
                      )}
                      <Text style={styles.subText}>
                        {addr.city}, {addr.state} {addr.zipCode}
                      </Text>
                    </View>

                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={isSelected ? Palette.primary : Palette.gray400}
                    />
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => setIsAddingNew(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={Palette.primary} />
                <Text style={styles.addNewText}>Add New Address</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.fieldLabel}>Address Type</Text>
              <View style={styles.labelPickerRow}>
                {(['Home', 'Work', 'Other'] as const).map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[
                      styles.typePill,
                      label === l && styles.typePillActive,
                    ]}
                    onPress={() => setLabel(l)}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        label === l && styles.typePillTextActive,
                      ]}
                    >
                      {l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Street Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 742 Evergreen Terrace"
                placeholderTextColor={Palette.gray400}
                value={street}
                onChangeText={setStreet}
              />

              <Text style={styles.fieldLabel}>Apartment / Suite (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Apt 4B"
                placeholderTextColor={Palette.gray400}
                value={apartment}
                onChangeText={setApartment}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Springfield"
                    placeholderTextColor={Palette.gray400}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                <View style={{ flex: 1, marginHorizontal: 8 }}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="IL"
                    placeholderTextColor={Palette.gray400}
                    value={state}
                    onChangeText={setState}
                  />
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={styles.fieldLabel}>Zip Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="62704"
                    placeholderTextColor={Palette.gray400}
                    value={zipCode}
                    onChangeText={setZipCode}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formActionRow}>
                <Button
                  title="Back"
                  variant="outline"
                  onPress={() => setIsAddingNew(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Save Address"
                  onPress={handleSaveNewAddress}
                  style={{ flex: 2 }}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.gray900,
  },
  closeBtn: {
    padding: 4,
  },
  scrollList: {
    maxHeight: 380,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Palette.gray200,
    marginBottom: Spacing.two,
    backgroundColor: Palette.gray50,
  },
  addressItemSelected: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primarySoft,
  },
  addressLeft: {
    flex: 1,
    marginRight: 10,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.gray200,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray800,
  },
  streetText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  subText: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 1,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.primary,
    borderRadius: BorderRadius.md,
    marginTop: 8,
  },
  addNewText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  formScroll: {
    maxHeight: 440,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray700,
    marginBottom: 4,
    marginTop: 8,
  },
  labelPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  typePill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  typePillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray700,
  },
  typePillTextActive: {
    color: Palette.white,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Palette.gray900,
    backgroundColor: Palette.white,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formActionRow: {
    flexDirection: 'row',
    marginTop: Spacing.four,
  },
});
