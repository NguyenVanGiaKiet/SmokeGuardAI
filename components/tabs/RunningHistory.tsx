import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface RunLog {
  id: string;
  date: string;
  steps: number;
  distance: string;
}

export const RunningHistory = ({
  themeColors,
  history,
  onDelete,
}: {
  themeColors: any;
  history: RunLog[];
  onDelete: (id: string) => void;
}) => {
  const confirmDelete = (id: string) => {
    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc muốn xóa mục này khỏi lịch sử chạy?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => onDelete(id) },
      ]
    );
  };

  const renderItem = ({ item }: { item: RunLog }) => (
    <View style={[styles.historyItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={styles.historyInfo}>
        <Text style={[styles.dateText, { color: themeColors.muted }]}>{item.date}</Text>
        <Text style={[styles.statText, { color: themeColors.text }]}>{item.steps} bước</Text>
        <Text style={[styles.statText, { color: themeColors.text }]}>{item.distance} km</Text>
      </View>
      <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn} hitSlop={8}>
        <IconSymbol size={18} name="chevron.right" color={themeColors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: themeColors.text }]}>Lịch sử chạy</Text>
      {history.length === 0 ? (
        <Text style={{color: themeColors.muted}}>Chưa có lịch sử chạy nào.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    // No marginTop here — RunTracker's card already has marginBottom: 24,
    // which matches the spacing used between breathingCard and the
    // cravings-log section on the Breathing page. Adding marginTop here
    // on top of that would double the gap (24 + 20 = 44px) instead of
    // matching it.
    marginBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  listContent: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyInfo: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteBtn: {
    padding: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statText: {
    fontSize: 14,
    fontWeight: '700',
  },
});