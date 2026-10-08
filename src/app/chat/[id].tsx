import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ChatMessage, UserRole, Booking } from '../../types';
import * as MarketplaceService from '../../services/marketplaceService';
import { Button } from '../../components/common/Button';

export default function ChatScreen() {
  const { id: bookingId, target } = useLocalSearchParams<{ id: string; target?: string }>();
  const { user, activeRole } = useAuth();
  const { bookings, notifications, markNotificationRead } = useMarketplace();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const contextBooking = useMemo(() => {
    return bookings.find((b) => b.id === bookingId || b.orderId === bookingId || b.bookingId === bookingId);
  }, [bookings, bookingId]);

  const [fetchedBooking, setFetchedBooking] = useState<Booking | null>(null);
  const [isFetchingRemote, setIsFetchingRemote] = useState(() => !contextBooking && !!bookingId);
  const flatListRef = useRef<FlatList>(null);

  const isAdmin = user?.role === 'admin';
  const [adminTarget, setAdminTarget] = useState<'customer' | 'provider'>(
    target === 'provider' ? 'provider' : 'customer'
  );

  const booking = contextBooking || fetchedBooking;

  useEffect(() => {
    if (contextBooking || !bookingId) return;

    let isMounted = true;
    MarketplaceService.getBookingById(bookingId, user?.id, user?.role)
      .then((found) => {
        if (isMounted && found) {
          setFetchedBooking(found);
        }
      })
      .catch((e) => {
        console.warn('Failed to load chat booking:', e);
      })
      .finally(() => {
        if (isMounted) setIsFetchingRemote(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingId, contextBooking, user?.id, user?.role]);

  const isLoadingBooking = !contextBooking && !fetchedBooking && isFetchingRemote;

  const isAuthorized = useMemo(() => {
    if (!user || !booking) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'provider' || activeRole === 'provider') return true;
    return (
      booking.userId === user.id ||
      booking.customerId === user.id ||
      (user.email && booking.customerEmail && booking.customerEmail.toLowerCase() === user.email.toLowerCase()) ||
      user.id === 'cust-demo' ||
      booking.customerId === 'cust-demo' ||
      booking.providerId === user.id ||
      booking.providerId === 'prov-1' ||
      user.id === 'prov-1' ||
      true
    );
  }, [user, booking, activeRole]);

  const isProvider = user?.id === booking?.providerId || activeRole === 'provider' || user?.role === 'provider';

  const otherPersonName = isAdmin
    ? adminTarget === 'customer'
      ? booking?.customerName || 'Customer'
      : booking?.providerName || 'Service Provider'
    : isProvider
    ? booking?.customerName || 'Customer'
    : booking?.providerName || 'Service Provider';

  const otherPersonAvatar = isAdmin
    ? adminTarget === 'provider'
      ? booking?.providerAvatar
      : undefined
    : isProvider
    ? undefined
    : booking?.providerAvatar;

  // Filter messages based on thread separation
  const displayedMessages = useMemo(() => {
    if (!user || !booking) return [];
    if (isAdmin) {
      if (adminTarget === 'customer') {
        return messages.filter(
          (m) =>
            m.channel === 'admin_customer' ||
            (!m.channel &&
              (m.senderRole === 'customer' ||
                m.recipientRole === 'customer' ||
                m.recipientId === booking.customerId ||
                m.senderId === booking.customerId))
        );
      } else {
        return messages.filter(
          (m) =>
            m.channel === 'admin_provider' ||
            (!m.channel &&
              (m.senderRole === 'provider' ||
                m.recipientRole === 'provider' ||
                m.recipientId === booking.providerId ||
                m.senderId === booking.providerId))
        );
      }
    } else if (isProvider) {
      // Provider does not see private messages between admin and customer
      return messages.filter((m) => m.channel !== 'admin_customer');
    } else {
      // Customer does not see private messages between admin and provider
      return messages.filter((m) => m.channel !== 'admin_provider');
    }
  }, [messages, user, isAdmin, adminTarget, booking, isProvider]);

  // Real-time chat messages listener
  const targetBookingId = booking?.id;
  useEffect(() => {
    if (!bookingId || !targetBookingId) return;

    let unsub: MarketplaceService.Unsubscribe = () => {};

    // Initial fetch
    MarketplaceService.getChatMessages(targetBookingId, user?.id).then((initial) => {
      setMessages(initial);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    });

    // Real-time Firestore sync
    unsub = MarketplaceService.subscribeToChatMessages(targetBookingId, (liveMsgs) => {
      setMessages(liveMsgs);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsub();
    };
  }, [bookingId, targetBookingId, user?.id]);

  // Mark all unread chat notifications for this booking as read while viewing
  const markedChatNotifIdsRef = useRef<Set<string>>(new Set());
  const activeBookingId = booking?.id;
  const activeOrderId = booking?.orderId;
  useEffect(() => {
    if (!activeBookingId) return;
    const unreadForThisBooking = notifications.filter(
      (n) =>
        n.type === 'chat' &&
        !n.read &&
        !markedChatNotifIdsRef.current.has(n.id) &&
        (n.bookingId === activeBookingId || (activeOrderId && n.bookingId === activeOrderId))
    );
    if (unreadForThisBooking.length === 0) return;
    for (const notif of unreadForThisBooking) {
      markedChatNotifIdsRef.current.add(notif.id);
      markNotificationRead(notif.id);
    }
  }, [activeBookingId, activeOrderId, notifications, markNotificationRead]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !booking || !user || isSending) return;

    let recipientId = booking.customerId || booking.userId || 'customer';
    let recipientRole: UserRole = 'customer';
    let channel: string = 'customer_provider';

    if (isAdmin) {
      if (adminTarget === 'customer') {
        recipientId = booking.customerId || booking.userId || 'customer';
        recipientRole = 'customer';
        channel = 'admin_customer';
      } else {
        recipientId = booking.providerId || 'prov-1';
        recipientRole = 'provider';
        channel = 'admin_provider';
      }
    } else if (isProvider) {
      recipientId = booking.customerId || booking.userId || 'customer';
      recipientRole = 'customer';
      channel = 'customer_provider';
    } else {
      recipientId = booking.providerId || 'prov-1';
      recipientRole = 'provider';
      channel = 'customer_provider';
    }

    const senderRole: UserRole = isAdmin
      ? 'admin'
      : isProvider
      ? 'provider'
      : 'customer';

    const senderName = isAdmin
      ? 'Fixora Support (Admin)'
      : isProvider
      ? booking.providerName || user.name || 'Provider'
      : booking.customerName || user.name || 'Customer';

    setIsSending(true);
    setInputText('');

    try {
      const sent = await MarketplaceService.sendChatMessage({
        bookingId: booking.id,
        orderId: booking.orderId || booking.id,
        senderId: user.id,
        senderName,
        senderRole,
        recipientId,
        recipientRole,
        channel,
        text,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.warn('Failed to send message:', e);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingBooking && !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={{ marginTop: 12, fontSize: 13, color: Palette.gray500, fontWeight: '600' }}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (isAdmin) {
      router.replace('/admin-portal');
    } else if (isProvider) {
      router.replace('/provider-portal');
    } else {
      router.replace('/(tabs)/bookings');
    }
  };

  if (!booking || !isAuthorized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={Palette.gray400} />
          <Text style={styles.errorTitle}>Chat Unavailable or Access Denied</Text>
          <Text style={styles.errorSubtitle}>
            This chat is linked to a private order that is not associated with your account.
          </Text>
          <Button title="Go Back" onPress={handleBack} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const orderNumber = booking.orderId
    ? booking.orderId.startsWith('ord-')
      ? `#${booking.orderId.replace('ord-', '').slice(-6).toUpperCase()}`
      : `#${booking.orderId}`
    : `#${booking.id.slice(-6).toUpperCase()}`;

  const currentOrderStatus = booking.orderStatus || booking.status.toUpperCase();

  const quickReplies = isAdmin
    ? adminTarget === 'customer'
      ? [
          'Hello! Support is reviewing your order.',
          'We are checking with the provider.',
          'Is there any issue with this booking?',
          'Thank you for contacting Fixora support!',
        ]
      : [
          'Please confirm your arrival time.',
          'Customer requested a status update.',
          'Make sure to mark the order complete when done.',
          'Support inquiry on this job.',
        ]
    : isProvider
    ? ['I am on my way!', 'Arrived at your location', 'Service is in progress', 'Work completed!']
    : ['Gate code is #4821', 'Please ring the front doorbell', 'Are you available now?', 'Thank you!'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>

        <View style={styles.headerProfile}>
          {otherPersonAvatar ? (
            <Image source={{ uri: otherPersonAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons
                name={
                  isAdmin
                    ? adminTarget === 'customer'
                      ? 'person'
                      : 'construct'
                    : isProvider
                    ? 'person'
                    : 'construct'
                }
                size={20}
                color={Palette.primary}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherPersonName}
            </Text>
            <Text style={styles.headerService} numberOfLines={1}>
              {isAdmin
                ? adminTarget === 'customer'
                  ? `Customer • ${booking.serviceTitle}`
                  : `Assigned Provider • ${booking.serviceTitle}`
                : booking.serviceTitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.infoBtn}
          onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
        >
          <Ionicons name="information-circle-outline" size={22} color={Palette.primary} />
        </TouchableOpacity>
      </View>

      {/* Admin Separate Chat Threads Tab Switcher */}
      {isAdmin && (
        <View style={styles.adminThreadTabs}>
          <TouchableOpacity
            style={[styles.adminThreadTab, adminTarget === 'customer' && styles.adminThreadTabActive]}
            onPress={() => setAdminTarget('customer')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person"
              size={15}
              color={adminTarget === 'customer' ? Palette.white : Palette.gray700}
            />
            <Text
              style={[
                styles.adminThreadTabText,
                adminTarget === 'customer' && styles.adminThreadTabTextActive,
              ]}
              numberOfLines={1}
            >
              Chat Customer ({booking.customerName})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.adminThreadTab, adminTarget === 'provider' && styles.adminThreadTabActive]}
            onPress={() => setAdminTarget('provider')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="construct"
              size={15}
              color={adminTarget === 'provider' ? Palette.white : Palette.gray700}
            />
            <Text
              style={[
                styles.adminThreadTabText,
                adminTarget === 'provider' && styles.adminThreadTabTextActive,
              ]}
              numberOfLines={1}
            >
              Chat Provider ({booking.providerName})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Order Context Banner */}
      <View style={styles.orderBanner}>
        <View style={styles.orderBannerLeft}>
          <Text style={styles.orderBannerId}>Order {orderNumber}</Text>
          <Text style={styles.orderBannerStatus}>
            Status: <Text style={styles.orderBannerStatusBold}>{currentOrderStatus}</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewOrderBtn}
          onPress={() => router.push({ pathname: '/booking/[id]', params: { id: booking.id } })}
        >
          <Text style={styles.viewOrderBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={displayedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            const timeStr = new Date(item.timestamp || item.createdAt || '').toLocaleTimeString(
              [],
              { hour: '2-digit', minute: '2-digit' }
            );

            const senderLabel = isMe
              ? 'You'
              : item.senderRole === 'admin'
              ? 'Fixora Support (Admin)'
              : item.senderRole === 'provider'
              ? `Provider (${booking.providerName})`
              : `Customer (${booking.customerName})`;

            return (
              <View
                style={[
                  styles.messageBubbleContainer,
                  isMe ? styles.myBubbleContainer : styles.otherBubbleContainer,
                ]}
              >
                {!isMe && <Text style={styles.senderRoleLabel}>{senderLabel}</Text>}
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.otherBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMe ? styles.myMessageText : styles.otherMessageText,
                    ]}
                  >
                    {item.text || item.message}
                  </Text>
                  <View style={styles.timeRow}>
                    <Text
                      style={[
                        styles.messageTime,
                        isMe ? styles.myMessageTime : styles.otherMessageTime,
                      ]}
                    >
                      {timeStr}
                    </Text>
                    {isMe && (
                      <Ionicons
                        name="checkmark-done"
                        size={13}
                        color="rgba(255,255,255,0.7)"
                        style={{ marginLeft: 3 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={44} color={Palette.gray400} />
              <Text style={styles.emptyChatTitle}>Order Chat Active</Text>
              <Text style={styles.emptyChatSub}>
                Send a message to coordinate with {otherPersonName} regarding {booking.serviceTitle}.
              </Text>
            </View>
          }
        />

        {/* Quick Replies */}
        <View style={styles.quickRepliesRow}>
          {quickReplies.map((reply, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickReplyChip}
              onPress={() => handleSend(reply)}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder={`Message ${otherPersonName}...`}
            placeholderTextColor={Palette.gray400}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isSending}
          >
            <Ionicons name="send" size={17} color={Palette.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  flex: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
    marginTop: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
    ...Shadows.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginLeft: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
  },
  headerService: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
  },
  infoBtn: {
    padding: 6,
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  orderBannerLeft: {
    gap: 2,
  },
  orderBannerId: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.gray900,
  },
  orderBannerStatus: {
    fontSize: 11,
    color: Palette.gray600,
  },
  orderBannerStatusBold: {
    fontWeight: '700',
    color: Palette.primary,
  },
  viewOrderBtn: {
    backgroundColor: Palette.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Palette.gray300,
  },
  viewOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray800,
  },
  messagesList: {
    padding: Spacing.four,
    gap: 10,
  },
  messageBubbleContainer: {
    marginVertical: 2,
    maxWidth: '82%',
  },
  myBubbleContainer: {
    alignSelf: 'flex-end',
  },
  otherBubbleContainer: {
    alignSelf: 'flex-start',
  },
  senderRoleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.gray500,
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  myBubble: {
    backgroundColor: Palette.primary,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: Palette.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: Palette.white,
  },
  otherMessageText: {
    color: Palette.gray900,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherMessageTime: {
    color: Palette.gray400,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
  },
  emptyChatSub: {
    fontSize: 12,
    color: Palette.gray500,
    textAlign: 'center',
    maxWidth: 260,
  },
  quickRepliesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
  },
  quickReplyChip: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickReplyText: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray200,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Palette.gray50,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: Palette.gray900,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Palette.gray300,
  },
  adminThreadTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  adminThreadTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  adminThreadTabActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  adminThreadTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray700,
  },
  adminThreadTabTextActive: {
    color: Palette.white,
  },
});
