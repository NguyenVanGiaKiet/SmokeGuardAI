import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ChatThread } from '@/utils/ai-coach-service';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
  threads: ChatThread[];
  activeThreadId: string | null;
  onNewChat: () => void;
  onSwitchThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  drawerAnim: Animated.Value;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  visible,
  onClose,
  threads,
  activeThreadId,
  onNewChat,
  onSwitchThread,
  onDeleteThread,
  drawerAnim,
}) => {
  const { activeScheme } = useTheme();
  const { t } = useLanguage();
  const themeColors = Colors[activeScheme];
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const translateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  const backdropOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={styles.flexFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebarContainer,
          {
            backgroundColor: themeColors.background,
            borderLeftColor: themeColors.border,
            transform: [{ translateX }],
          },
        ]}
      >
        <SafeAreaView edges={['bottom']} style={styles.sidebarContent}>
          <View style={[styles.sidebarHeader, { borderBottomColor: themeColors.border, paddingTop: insets.top + 14 }]}>
            <Text style={[styles.sidebarTitle, { color: themeColors.text }]}>{t('coach.sidebarTitle')}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: themeColors.border + '33' }]}
            >
              <IconSymbol size={18} name="chevron.right" color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.newChatBtn, { borderColor: themeColors.tint }]}
            onPress={onNewChat}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="plus" color={themeColors.tint} />
            <Text style={[styles.newChatBtnText, { color: themeColors.tint }]}>{t('coach.newChat')}</Text>
          </TouchableOpacity>

          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.sidebarList}
            ListEmptyComponent={
              <View style={styles.sidebarEmpty}>
                <Text style={{ color: themeColors.muted, fontSize: 13, textAlign: 'center' }}>
                  {t('coach.noChats')}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isActive = item.id === activeThreadId;
              return (
                <View
                  style={[
                    styles.threadItem,
                    {
                      backgroundColor: isActive ? themeColors.tint + '12' : 'transparent',
                      borderColor: isActive ? themeColors.tint + '33' : 'transparent',
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.threadClickable}
                    onPress={() => onSwitchThread(item.id)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      size={16}
                      name="clock"
                      color={isActive ? themeColors.tint : themeColors.muted}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.threadText,
                        {
                          color: isActive ? themeColors.tint : themeColors.text,
                          fontWeight: isActive ? '600' : '400',
                        },
                      ]}
                    >
                      {t(item.title)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => onDeleteThread(item.id)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol size={14} name="trash" color={themeColors.muted} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    borderLeftWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    zIndex: 1000,
  },
  sidebarContent: { flex: 1 },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sidebarTitle: { fontSize: 15, fontWeight: '600' },
  closeBtn: { width: 40, height: 40, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  newChatBtnText: { fontSize: 14, fontWeight: '600' },
  sidebarList: { paddingHorizontal: 12, gap: 6 },
  sidebarEmpty: { paddingVertical: 32, alignItems: 'center' },
  threadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  threadClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 8,
  },
  threadText: { fontSize: 14, flex: 1 },
  deleteBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 4, marginRight: 4 },
});
