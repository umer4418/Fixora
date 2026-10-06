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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ChatMessage } from '../../types';
import * as MarketplaceService from '../../services/marketplaceService';

export default function ChatScreen() {
  const { id: bookingId } = useLocalSearchParams<{ id: string }>();
  const { user, activeRole } = useAuth();
  const { bookings } = useMarketplace();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const booking = useMemo(() => {
    return bookings.find((b) => b.id === bookingId);
  }, [bookings, bookingId]);

  const otherPersonName =
    activeRole === 'provider'
      ? booking?.customerName || 'Customer'
      : booking?.providerName || 'Service Provider';

  const otherPersonAvatar =
    activeRole === 'provider'
      ? undefined
      : booking?.providerAvatar;

  useEffect(() => {
    async function loadMessages() {
      if (!bookingId) return;
      const list = await MarketplaceService.getChatMessages(bookingId);
      setMessages(list);
    }
    loadMessages();
  }, [bookingId]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !bookingId) return;

    const recipientId =
      activeRole === 'provider'
        ? booking?.customerId || 'cust-demo'
        : booking?.providerId || 'prov-1';

    const sent = await MarketplaceService.sendChatMessage({
      bookingId,
      senderId: user?.id || 'cust-demo',
      senderName: user?.name || (activeRole === 'provider' ? 'Provider' : 'Customer'),
      senderRole: activeRole,
      recipientId,
      text,
    });

    setMessages((prev) => [...prev, sent]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const quickReplies =
    activeRole === 'provider'
      ? ['On the way!', 'Arrived at location', 'Work completed']
      : ['Gate code is #4821', 'Please ring doorbell', 'Thank you!'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>

        <View style={styles.headerProfile}>
          {otherPersonAvatar ? (
            <Image source={{ uri: otherPersonAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color={Palette.gray600} />
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{otherPersonName}</Text>
            <Text style={styles.headerService} numberOfLines={1}>
              {booking?.serviceTitle || 'Home Service'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => alert(`Calling ${otherPersonName}...`)}
        >
          <Ionicons name="call" size={18} color={Palette.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id || item.senderRole === activeRole;
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <View
                style={[
                  styles.messageBubbleContainer,
                  isMe ? styles.myBubbleContainer : styles.otherBubbleContainer,
                ]}
              >
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
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isMe ? styles.myMessageTime : styles.otherMessageTime,
                    ]}
                  >
                    {timeStr}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={44} color={Palette.gray400} />
              <Text style={styles.emptyChatTitle}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>
                Send a message to coordinate service details with {otherPersonName}.
              </Text>
            </View>
          }
        />

        {/* Quick Responses */}
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
            placeholder="Type your message..."
            placeholderTextColor={Palette.gray400}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color={Palette.white} />
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
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  headerService: {
    fontSize: 11,
    color: Palette.gray500,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: Spacing.four,
    paddingBottom: Spacing.two,
  },
  messageBubbleContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  myBubbleContainer: {
    alignSelf: 'flex-end',
  },
  otherBubbleContainer: {
    alignSelf: 'flex-start',
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
    borderWidth: 1,
    borderColor: Palette.gray200,
    borderBottomLeftRadius: 2,
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
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: Palette.gray400,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
    marginTop: 8,
  },
  emptyChatSub: {
    fontSize: 12,
    color: Palette.gray500,
    textAlign: 'center',
    marginTop: 4,
  },
  quickRepliesRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    gap: 8,
    backgroundColor: Palette.gray50,
  },
  quickReplyChip: {
    backgroundColor: Palette.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.gray300,
  },
  quickReplyText: {
    fontSize: 11,
    color: Palette.gray700,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray200,
  },
  textInput: {
    flex: 1,
    backgroundColor: Palette.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: Palette.gray900,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
