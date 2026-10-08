import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows } from '../../constants/theme';
import { Booking, ChatMessage } from '../../types';
import * as MarketplaceService from '../../services/marketplaceService';
import { useMarketplace } from '../../context/MarketplaceContext';

interface LiveChatPopupWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  customerChatsList: Booking[];
  unreadCount?: number;
  currentUserId?: string;
  currentUserName?: string;
}

const QUICK_REPLIES = [
  'I am on my way!',
  'Arrived at your location',
  'Starting the service now',
  'Work completed!',
];

export function LiveChatPopupWidget({
  isOpen,
  onToggle,
  customerChatsList,
  unreadCount = 0,
  currentUserId = 'prov-1',
  currentUserName = 'Service Provider',
}: LiveChatPopupWidgetProps) {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const windowHeight = dimensions.height;
  const windowWidth = dimensions.width;
  const isSmallScreen = windowWidth < 460;

  // Space reserved at the top so the dialogue header is always 100% visible on screen
  const topSafePadding = Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 50 : 36;
  // Bottom reserved space: bottom margin + circular button (58px) + gap (10px)
  const bottomReservedSpace = (isSmallScreen ? 12 : 20) + 58 + 10;

  // Maximum allowed height for the dialog card to never overflow the top edge of screen
  const maxAllowedHeight = Math.max(260, windowHeight - topSafePadding - bottomReservedSpace);
  // Ideal height: 490px on desktop, 450px on mobile, capped strictly by maxAllowedHeight
  const computedCardHeight = Math.min(isSmallScreen ? 450 : 490, maxAllowedHeight);
  // Responsive card width
  const computedCardWidth = isSmallScreen ? Math.min(windowWidth - 24, 380) : 375;

  // Selected customer booking ID to chat with (or null for list view)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Derive the active booking directly (if exactly 1 customer exists and none explicitly selected, default to it)
  const selectedBooking: Booking | null = selectedBookingId
    ? customerChatsList.find((b) => b.id === selectedBookingId) || null
    : customerChatsList.length === 1
      ? customerChatsList[0]
      : null;

  const { notifications, markNotificationRead } = useMarketplace();

  // Helper to count unread messages for a given customer booking
  const getBookingUnread = (bookingId: string, orderId?: string) => {
    return notifications.filter(
      (n) =>
        n.type === 'chat' &&
        !n.read &&
        (n.bookingId === bookingId || (orderId && n.bookingId === orderId))
    ).length;
  };

  // Live total unread chats across all customers
  const liveUnreadChatCount = notifications.filter((n) => n.type === 'chat' && !n.read).length;
  const effectiveUnread = Math.max(unreadCount, liveUnreadChatCount);

  // Auto-mark notifications as read when actively viewing that customer's chat
  const markedNotifIdsRef = useRef<Set<string>>(new Set());
  const activeBookingId = selectedBooking?.id;
  const activeOrderId = selectedBooking?.orderId;

  useEffect(() => {
    if (!activeBookingId) return;
    const unreadForThisBooking = notifications.filter(
      (n) =>
        n.type === 'chat' &&
        !n.read &&
        !markedNotifIdsRef.current.has(n.id) &&
        (n.bookingId === activeBookingId ||
          (activeOrderId && n.bookingId === activeOrderId))
    );
    if (unreadForThisBooking.length === 0) return;
    for (const notif of unreadForThisBooking) {
      markedNotifIdsRef.current.add(notif.id);
      markNotificationRead(notif.id);
    }
  }, [activeBookingId, activeOrderId, notifications, markNotificationRead]);

  const [orderMessages, setOrderMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Smooth popup animation
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isOpen) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 120);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, fadeAnim]);

  // Subscribe to real-time chat messages when a customer is selected
  useEffect(() => {
    if (!activeBookingId) return;

    let unsub: MarketplaceService.Unsubscribe = () => {};

    MarketplaceService.getChatMessages(activeBookingId, currentUserId).then((initial) => {
      setOrderMessages(initial);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 80);
    });

    unsub = MarketplaceService.subscribeToChatMessages(activeBookingId, (liveMsgs) => {
      // Show messages relevant for provider (hide admin-customer private messages)
      const filtered = liveMsgs.filter((m) => m.channel !== 'admin_customer');
      setOrderMessages(filtered);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    });

    return () => {
      unsub();
    };
  }, [activeBookingId, currentUserId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedBooking || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      await MarketplaceService.sendChatMessage({
        bookingId: selectedBooking.id,
        orderId: selectedBooking.orderId || selectedBooking.id,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: 'provider',
        recipientId: selectedBooking.customerId || selectedBooking.userId || 'customer',
        recipientRole: 'customer',
        channel: 'customer_provider',
        text,
      });

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 60);
    } catch (e) {
      console.warn('Failed to send customer message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleHeaderBack = () => {
    if (selectedBooking && customerChatsList.length > 1) {
      setSelectedBookingId(null);
    } else {
      onToggle();
    }
  };

  const handleOpenFullScreen = () => {
    if (selectedBooking) {
      onToggle();
      router.push({
        pathname: '/chat/[id]',
        params: { id: selectedBooking.id },
      });
    }
  };

  return (
    <View
      style={[
        styles.floatingContainer,
        isSmallScreen && styles.floatingContainerMobile,
        { top: topSafePadding },
      ]}
      pointerEvents="box-none"
    >
      {/* Pop-up Live Chat Card */}
      {isOpen && (
        <Animated.View
          style={[
            styles.chatCard,
            {
              width: computedCardWidth,
              height: computedCardHeight,
              maxHeight: maxAllowedHeight,
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Top Bluish Header Bar (matching screenshot layout with Fixora Royal Blue) */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={handleHeaderBack}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Back or minimize"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleCenter}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {selectedBooking ? selectedBooking.customerName : 'Customer Chats'}
              </Text>
              {selectedBooking && (
                <Text style={styles.headerSubtitleText} numberOfLines={1}>
                  {selectedBooking.serviceTitle} • ${selectedBooking.totalPrice}
                </Text>
              )}
            </View>

            <View style={styles.headerRightActions}>
              {selectedBooking && (
                <TouchableOpacity
                  onPress={handleOpenFullScreen}
                  style={styles.headerBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Open Full Screen"
                >
                  <Ionicons name="open-outline" size={19} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onToggle}
                style={styles.headerBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* VIEW 1: CUSTOMERS CONVERSATIONS LIST (When no specific customer is selected) */}
          {!selectedBooking ? (
            <ScrollView
              style={styles.customersScrollView}
              contentContainerStyle={styles.customersListContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.customersSectionTitle}>
                Customer Bookings ({customerChatsList.length})
              </Text>

              {customerChatsList.length === 0 ? (
                <View style={styles.emptyCustomersBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={Palette.gray400} />
                  <Text style={styles.emptyCustomersTitle}>No Customer Chats Yet</Text>
                  <Text style={styles.emptyCustomersSub}>
                    When customers book your services, their conversations will automatically appear here.
                  </Text>
                </View>
              ) : (
                customerChatsList.map((item) => {
                  const itemUnread = getBookingUnread(item.id, item.orderId);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.customerListItem, itemUnread > 0 && styles.customerListItemUnread]}
                      onPress={() => setSelectedBookingId(item.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.customerAvatarBox}>
                        <Ionicons name="person" size={20} color={Palette.primary} />
                        {itemUnread > 0 && <View style={styles.avatarUnreadBadgeDot} />}
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.customerCardTopRow}>
                          <Text style={styles.customerCardName}>{item.customerName}</Text>
                          <Text style={styles.customerCardPrice}>${item.totalPrice}</Text>
                        </View>
                        <Text style={styles.customerCardService} numberOfLines={1}>
                          {item.serviceTitle}
                        </Text>
                        <Text style={styles.customerCardDate}>
                          📅 {item.date} • {item.timeSlot}
                        </Text>
                        {itemUnread > 0 && (
                          <View style={styles.newMsgBadgeRow}>
                            <View style={styles.newMsgDot} />
                            <Text style={styles.newMsgBadgeText}>
                              {itemUnread === 1 ? 'New message received' : `${itemUnread} new messages`}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={[styles.openChatPill, itemUnread > 0 && styles.openChatPillUnread]}>
                        <Text style={[styles.openChatPillText, itemUnread > 0 && styles.openChatPillTextUnread]}>
                          {itemUnread > 0 ? `Chat (${itemUnread})` : 'Chat'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          ) : (
            /* VIEW 2: ACTIVE CUSTOMER CHAT (EXACT SCREENSHOT LAYOUT IN FIXORA ROYAL BLUE) */
            <KeyboardAvoidingView
              style={styles.chatBody}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatScrollView}
                contentContainerStyle={styles.messagesScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Initial Customer Greeting / Order Context (Matching Left Avatar Bubble from Screenshot) */}
                <View style={styles.customerGreetingGroup}>
                  <View style={styles.customerAvatarCircle}>
                    <Ionicons name="person" size={22} color={Palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerSenderLabel}>{selectedBooking.customerName}</Text>
                    <View style={styles.customerSpeechBubble}>
                      <Text style={styles.customerSpeechBubbleText}>
                        👋 Hello! Looking forward to the {selectedBooking.serviceTitle} service on {selectedBooking.date}.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Real-time Order Messages */}
                {orderMessages.map((m) => {
                  const isMe = m.senderId === currentUserId || m.senderRole === 'provider';
                  const timeStr = new Date(m.timestamp || m.createdAt || '').toLocaleTimeString(
                    [],
                    { hour: '2-digit', minute: '2-digit' }
                  );

                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.messageRow,
                        isMe ? styles.messageRowMe : styles.messageRowOther,
                      ]}
                    >
                      {!isMe && (
                        <Text style={styles.otherSenderSmallLabel}>{m.senderName || selectedBooking.customerName}</Text>
                      )}
                      <View
                        style={[
                          styles.messageBubble,
                          isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isMe ? styles.messageTextMe : styles.messageTextOther,
                          ]}
                        >
                          {m.text || m.message}
                        </Text>
                        <View style={styles.bubbleTimeRow}>
                          <Text
                            style={[
                              styles.messageTime,
                              isMe ? styles.messageTimeMe : styles.messageTimeOther,
                            ]}
                          >
                            {timeStr}
                          </Text>
                          {isMe && (
                            <Ionicons
                              name="checkmark-done"
                              size={12}
                              color="rgba(255,255,255,0.7)"
                              style={{ marginLeft: 3 }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Quick Reply Action Pills on Right (Matching Outline Buttons from Screenshot) */}
                <View style={styles.quickRepliesContainer}>
                  {QUICK_REPLIES.map((reply, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.quickReplyPill}
                      onPress={() => handleSendMessage(reply)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.quickReplyPillText}>{reply}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Bottom Input Row (Matching Screenshot: Type here and press enter.. + 👍 📎 😊) */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type here and press enter.."
                  placeholderTextColor={Palette.gray400}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => handleSendMessage()}
                  returnKeyType="send"
                />

                <View style={styles.inputIconsRow}>
                  {inputText.trim().length > 0 ? (
                    <TouchableOpacity
                      onPress={() => handleSendMessage()}
                      style={styles.sendIconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="send" size={19} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => handleSendMessage('👍')}
                        style={styles.actionIconBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="thumbs-up-outline" size={20} color={Palette.gray600} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSendMessage('📎 Document / Location attached')}
                        style={styles.actionIconBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="attach-outline" size={22} color={Palette.gray600} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setInputText((prev) => prev + ' 😊 ')}
                        style={styles.actionIconBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="happy-outline" size={20} color={Palette.gray600} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </Animated.View>
      )}

      {/* Bottom Footer Row: [Powered by Fixora] + [Circular Toggle Button (down arrow or chat icon)] */}
      <View style={styles.bottomBarRow}>
        {isOpen && (
          <View style={styles.poweredByBadge}>
            <Ionicons name="chatbubbles" size={14} color={Palette.primary} />
            <Text style={styles.poweredByText}>Fixora Customer Chat</Text>
          </View>
        )}

        {/* Circular Floating Action Button in Fixora Royal Blue */}
        <TouchableOpacity
          style={[styles.floatingCircleBtn, isOpen && styles.floatingCircleBtnOpen]}
          onPress={onToggle}
          activeOpacity={0.85}
          accessibilityLabel="Toggle Customer Chat"
        >
          {isOpen ? (
            <Ionicons name="chevron-down" size={32} color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
              {effectiveUnread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {effectiveUnread > 9 ? '9+' : effectiveUnread}
                  </Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    ...(Platform.OS === 'web' ? { position: 'fixed' as const } : { position: 'absolute' as const }),
    bottom: 20,
    right: 20,
    zIndex: 99999,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  floatingContainerMobile: {
    bottom: 12,
    right: 12,
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.lg,
    elevation: 10,
  },
  headerBar: {
    height: 56,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  headerSubtitleText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customersScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  customersListContent: {
    padding: 14,
  },
  customersSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray700,
    marginBottom: 10,
  },
  customerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.gray200,
    gap: 10,
    ...Shadows.sm,
  },
  customerListItemUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1.5,
  },
  customerAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarUnreadBadgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  customerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerCardName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.gray900,
  },
  customerCardPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.primary,
  },
  customerCardService: {
    fontSize: 12,
    color: Palette.gray600,
    marginTop: 2,
  },
  customerCardDate: {
    fontSize: 10.5,
    color: Palette.gray500,
    marginTop: 2,
  },
  newMsgBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  newMsgDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  newMsgBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  openChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  openChatPillUnread: {
    backgroundColor: '#059669',
  },
  openChatPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  openChatPillTextUnread: {
    fontWeight: '800',
  },
  emptyCustomersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyCustomersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray800,
  },
  emptyCustomersSub: {
    fontSize: 12,
    color: Palette.gray500,
    textAlign: 'center',
    maxWidth: 240,
  },
  chatBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatScrollView: {
    flex: 1,
  },
  messagesScrollContent: {
    padding: 14,
    paddingBottom: 20,
  },
  customerGreetingGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  customerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  customerSenderLabel: {
    fontSize: 12.5,
    color: Palette.gray600,
    marginBottom: 4,
    fontWeight: '600',
  },
  customerSpeechBubble: {
    backgroundColor: Palette.primarySoft,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  customerSpeechBubbleText: {
    color: Palette.gray900,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  messageRow: {
    marginBottom: 10,
    maxWidth: '82%',
  },
  messageRowMe: {
    alignSelf: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
  },
  otherSenderSmallLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.gray500,
    marginBottom: 2,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleMe: {
    backgroundColor: Palette.primary,
    borderBottomRightRadius: 2,
  },
  messageBubbleOther: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  messageTextMe: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: Palette.gray900,
  },
  bubbleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  messageTime: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  messageTimeOther: {
    color: Palette.gray400,
  },
  quickRepliesContainer: {
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  quickReplyPill: {
    borderWidth: 1.5,
    borderColor: Palette.primary,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    ...Shadows.sm,
  },
  quickReplyPillText: {
    color: Palette.primary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: Palette.gray900,
    paddingVertical: 4,
  },
  inputIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 6,
  },
  actionIconBtn: {
    padding: 3,
  },
  sendIconBtn: {
    width: 32,
    height: 32,
    backgroundColor: Palette.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  poweredByBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.sm,
    gap: 6,
  },
  poweredByText: {
    fontSize: 12.5,
    color: Palette.gray700,
    fontWeight: '700',
  },
  floatingCircleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    elevation: 8,
  },
  floatingCircleBtnOpen: {
    backgroundColor: Palette.primaryDark,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Palette.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
