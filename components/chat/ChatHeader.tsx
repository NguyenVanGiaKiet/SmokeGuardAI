import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';

interface ChatHeaderProps {
  title: string;
  subtitle: string;
  onNewChat: () => void;
  onOpenSidebar: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  onNewChat,
  onOpenSidebar,
}) => {
  const { activeScheme } = useTheme();
  const themeColors = Colors[activeScheme];

  return (
    <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
      <View style={styles.headerLeft}>
        <View style={[styles.avatar, { backgroundColor: themeColors.tint + '1A' }]}>
          <IconSymbol size={18} name="sparkles" color={themeColors.tint} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{title}</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.muted }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          style={[styles.headerBtn, { marginRight: 12 }]}
          onPress={onNewChat}
          activeOpacity={0.7}
        >
          <IconSymbol size={20} name="plus" color={themeColors.tint} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={onOpenSidebar}
          activeOpacity={0.7}
        >
          <IconSymbol size={20} name="line.3.horizontal" color={themeColors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
});
