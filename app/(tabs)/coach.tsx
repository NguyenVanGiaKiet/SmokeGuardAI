import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  getChatHistory,
  saveMessage,
  sendMessageToCoach,
  ChatMessage,
} from '@/utils/ai-coach-service';

import { SafeAreaView } from 'react-native-safe-area-context';

const NEAR_BOTTOM_THRESHOLD = 80;

// Bong bóng tin nhắn có hiệu ứng nảy nhẹ khi vừa xuất hiện
function MessageBubble({
  item,
  themeColors,
  isNew,
  formatTime,
}: {
  item: ChatMessage;
  themeColors: any;
  isNew: boolean;
  formatTime: (iso: string) => string;
}) {
  const scale = useRef(new Animated.Value(isNew ? 0.85 : 1)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(isNew ? 10 : 0)).current;

  useEffect(() => {
    if (!isNew) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isNew]);

  return (
    <Animated.View
      style={[
        styles.messageWrapper,
        item.role === 'user' ? styles.userWrapper : styles.coachWrapper,
        { transform: [{ scale }, { translateY }], opacity },
      ]}
    >
      <View
        style={[
          styles.bubble,
          item.role === 'user' ? styles.userBubble : styles.coachBubble,
          {
            backgroundColor:
              item.role === 'user' ? themeColors.tint : themeColors.card,
            borderColor: item.role === 'user' ? 'transparent' : themeColors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: item.role === 'user' ? '#FFF' : themeColors.text },
          ]}
        >
          {item.text}
        </Text>
      </View>
      <Text
        style={[
          styles.timestamp,
          { color: themeColors.muted },
          item.role === 'user' ? styles.timestampRight : styles.timestampLeft,
        ]}
      >
        {formatTime(item.timestamp)}
      </Text>
    </Animated.View>
  );
}

export default function CoachScreen() {
  const { activeScheme } = useTheme();
  const themeColors = Colors[activeScheme];
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Theo dõi id tin nhắn nào là "mới" để áp hiệu ứng nảy
  const lastMessageIdRef = useRef<string | null>(null);
  const newMessageIdsRef = useRef<Set<string>>(new Set());

  // Có đang ở gần cuối đoạn chat hay không -> quyết định hiện nút nổi
  const [isNearBottom, setIsNearBottom] = useState(true);
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await getChatHistory();
    setMessages(history);
    if (history.length > 0) {
      lastMessageIdRef.current = history[history.length - 1].id;
    }
    // Vào màn hình là cuộn thẳng xuống cuối lịch sử chat
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  };

  // CHỈ tự cuộn xuống cuối khi có một tin nhắn MỚI được thêm vào
  // (người dùng gửi, hoặc Coach trả lời) — không can thiệp vào bất kỳ
  // lúc nào khác, để không phá thao tác cuộn tay của người dùng
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastMessageIdRef.current) return;

    newMessageIdsRef.current.add(last.id);
    lastMessageIdRef.current = last.id;

    // Một lần gọi ngay, một lần gọi sau khi animation/layout ổn định
    flatListRef.current?.scrollToEnd({ animated: true });
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [messages]);

  // Hiện/ẩn nút nổi tùy theo người dùng có đang ở gần cuối hay không
  useEffect(() => {
    Animated.spring(fabAnim, {
      toValue: !isNearBottom ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [isNearBottom]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setIsNearBottom(distanceFromBottom < NEAR_BOTTOM_THRESHOLD);
  }, []);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(userMsg);
    setInputText('');
    setIsTyping(true);

    const responseText = await sendMessageToCoach(
      userMsg.text,
      'User is quitting smoking.'
    );

    const coachMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: responseText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, coachMsg]);
    await saveMessage(coachMsg);
    setIsTyping(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <View style={[styles.avatar, { backgroundColor: themeColors.tint + '1A' }]}>
            <IconSymbol size={18} name="sparkles" color={themeColors.tint} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Coach</Text>
            <Text style={[styles.headerSubtitle, { color: themeColors.muted }]}>
              {isTyping ? 'Đang soạn tin nhắn…' : 'Luôn sẵn sàng đồng hành'}
            </Text>
          </View>
        </View>

        <View style={styles.flexFill}>
          <FlatList
            style={styles.flexFill}
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: themeColors.tint + '12' }]}>
                  <IconSymbol size={28} name="sparkles" color={themeColors.tint} />
                </View>
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                  Bắt đầu trò chuyện
                </Text>
                <Text style={[styles.emptyText, { color: themeColors.muted }]}>
                  Chia sẻ cảm giác của bạn hôm nay, Coach luôn ở đây để lắng nghe.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble
                item={item}
                themeColors={themeColors}
                isNew={newMessageIdsRef.current.has(item.id)}
                formatTime={formatTime}
              />
            )}
          />

          {/* Nút nổi: nhấn để lăn xuống tin nhắn cuối cùng */}
          <Animated.View
            pointerEvents={isNearBottom ? 'none' : 'auto'}
            style={[
              styles.fabContainer,
              {
                opacity: fabAnim,
                transform: [
                  {
                    scale: fabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                  {
                    translateY: fabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.fab,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
              ]}
              onPress={scrollToBottom}
              activeOpacity={0.85}
            >
              <IconSymbol size={16} name="arrow.down" color={themeColors.tint} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {isTyping && (
          <View style={styles.typingIndicator}>
            <View style={[styles.typingBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <ActivityIndicator size="small" color={themeColors.tint} />
              <Text style={{ color: themeColors.muted, marginLeft: 8, fontSize: 13 }}>
                Coach đang soạn...
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: themeColors.background, borderTopColor: themeColors.border },
          ]}
        >
          <View
            style={[
              styles.inputPill,
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Nhắn nhủ với Coach..."
              placeholderTextColor={themeColors.muted}
              multiline
              scrollEnabled
              onFocus={() => {
                // Đợi bàn phím trồi lên xong rồi mới cuộn, để tính đúng
                // chiều cao khả dụng còn lại của danh sách
                flatListRef.current?.scrollToEnd({ animated: true });
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 250);
              }}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? themeColors.tint : themeColors.border },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <IconSymbol size={18} name="arrow.up" color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexFill: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  chatList: { padding: 20, paddingBottom: 8, gap: 18, flexGrow: 1 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 240, lineHeight: 19 },

  messageWrapper: { gap: 4 },
  userWrapper: { alignItems: 'flex-end' },
  coachWrapper: { alignItems: 'flex-start' },

  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    maxWidth: '82%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  userBubble: { borderBottomRightRadius: 4 },
  coachBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21 },

  timestamp: { fontSize: 11 },
  timestampRight: { marginRight: 4 },
  timestampLeft: { marginLeft: 4 },

  typingIndicator: { paddingHorizontal: 20, paddingBottom: 10, alignItems: 'flex-start' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  inputPill: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fabContainer: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
  },
  fab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});