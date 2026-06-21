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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import {
  getThreads,
  createThread,
  deleteThread,
  getChatHistory,
  saveMessage,
  sendMessageToCoach,
  ChatMessage,
  ChatThread,
} from '@/utils/ai-coach-service';

const NEAR_BOTTOM_THRESHOLD = 80;

// Bong bóng tin nhắn có hiệu ứng nảy nhẹ khi vừa xuất hiện
const MessageBubble = React.memo(function MessageBubble({
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
});

export default function CoachScreen() {
  const { activeScheme } = useTheme();
  const { t } = useLanguage();
  const themeColors = Colors[activeScheme];
  const flatListRef = useRef<FlatList>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Trạng thái sidebar
  const [shouldRenderSidebar, setShouldRenderSidebar] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  // Theo dõi id tin nhắn nào là "mới" để áp hiệu ứng nảy
  const lastMessageIdRef = useRef<string | null>(null);
  const newMessageIdsRef = useRef<Set<string>>(new Set());

  // Có đang ở gần cuối đoạn chat hay không -> quyết định hiện nút nổi
  const [isNearBottom, setIsNearBottom] = useState(true);
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadThreadsAndHistory();
  }, []);

  const loadThreadsAndHistory = async () => {
    try {
      const list = await getThreads();
      setThreads(list);
      
      let activeId = activeThreadId;
      if (list.length > 0) {
        activeId = list[0].id;
        setActiveThreadId(activeId);
      } else {
        const newT = await createThread();
        activeId = newT.id;
        setActiveThreadId(activeId);
        setThreads([newT]);
      }
      
      const history = await getChatHistory(activeId);
      setMessages(history);
      if (history.length > 0) {
        lastMessageIdRef.current = history[history.length - 1].id;
      }
      
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    } catch (e) {
      console.error('Error loading threads/history:', e);
    }
  };

  // CHỈ tự cuộn xuống cuối khi có một tin nhắn MỚI được thêm vào
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.id === lastMessageIdRef.current) return;

    newMessageIdsRef.current.add(last.id);
    lastMessageIdRef.current = last.id;

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
    if (!inputText.trim() || !activeThreadId) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(userMsg, activeThreadId);
    setInputText('');
    setIsTyping(true);

    // Cập nhật danh sách cuộc hội thoại để cập nhật tiêu đề mới và vị trí đầu tiên
    const updatedThreads = await getThreads();
    setThreads(updatedThreads);

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
    await saveMessage(coachMsg, activeThreadId);
    setIsTyping(false);

    // Cập nhật lại list threads lần nữa để đảm bảo đồng bộ
    const finalThreads = await getThreads();
    setThreads(finalThreads);
  };

  const handleNewChat = async () => {
    try {
      const newT = await createThread();
      const updatedThreads = await getThreads();
      setThreads(updatedThreads);
      setActiveThreadId(newT.id);
      setMessages([]);
      closeSidebar();
    } catch (e) {
      console.error('Failed to create new chat:', e);
    }
  };

  const switchThread = async (threadId: string) => {
    try {
      setActiveThreadId(threadId);
      closeSidebar();
      const history = await getChatHistory(threadId);
      setMessages(history);
      
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    } catch (e) {
      console.error('Error switching thread:', e);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteThread(threadId);
      const list = await getThreads();
      setThreads(list);

      if (activeThreadId === threadId) {
        if (list.length > 0) {
          const firstThread = list[0];
          setActiveThreadId(firstThread.id);
          const history = await getChatHistory(firstThread.id);
          setMessages(history);
        } else {
          const newT = await createThread();
          setThreads([newT]);
          setActiveThreadId(newT.id);
          setMessages([]);
        }
      }
    } catch (e) {
      console.error('Error deleting thread:', e);
    }
  };

  const openSidebar = () => {
    setShouldRenderSidebar(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShouldRenderSidebar(false);
    });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Interpolations cho hiệu ứng slide sidebar
  const translateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  const backdropOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ChatHeader
          title={t('coach.title')}
          subtitle={isTyping ? t('coach.typing') : t('coach.ready')}
          onNewChat={handleNewChat}
          onOpenSidebar={openSidebar}
        />

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
                  {t('coach.emptyTitle')}
                </Text>
                <Text style={[styles.emptyText, { color: themeColors.muted }]}>
                  {t('coach.emptyDesc')}
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
                {t('coach.typingIndicator')}
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
              placeholder={t('coach.inputPlaceholder')}
              placeholderTextColor={themeColors.muted}
              multiline
              scrollEnabled
              onFocus={() => {
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

      <ChatSidebar
        visible={shouldRenderSidebar}
        onClose={closeSidebar}
        threads={threads}
        activeThreadId={activeThreadId}
        onNewChat={handleNewChat}
        onSwitchThread={switchThread}
        onDeleteThread={handleDeleteThread}
        drawerAnim={drawerAnim}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexFill: { flex: 1 },

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
    paddingBottom: 10,
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
