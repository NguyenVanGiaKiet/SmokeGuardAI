import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

interface RunLog {
  id: string;
  date: string;
  steps: number;
  distance: string;
}

export const RunningHistory = ({ themeColors, history }: { themeColors: any, history: RunLog[] }) => {
  const renderItem = ({ item }: { item: RunLog }) => (
    <View style={[styles.historyItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <Text style={[styles.dateText, { color: themeColors.muted }]}>{item.date}</Text>
      <Text style={[styles.statText, { color: themeColors.text }]}>{item.steps} bước</Text>
      <Text style={[styles.statText, { color: themeColors.text }]}>{item.distance} km</Text>
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
    marginTop: 20,
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
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
