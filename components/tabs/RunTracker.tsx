import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export const RunTracker = ({ themeColors, onStop }: { themeColors: any, onStop: (steps: number, distance: string) => void }) => {
  const [stepCount, setStepCount] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const startTracking = async () => {
    const { status } = await Pedometer.requestPermissionsAsync();
    
    if (status === 'granted') {
      const isAvailable = await Pedometer.isAvailableAsync();
      
      if (!isAvailable) {
         alert('Thiết bị không hỗ trợ cảm biến đếm bước chân.');
         return;
      }

      subscriptionRef.current = Pedometer.watchStepCount((result) => {
        setStepCount(result.steps);
      });
      setIsTracking(true);
    } else {
      alert('Ứng dụng cần quyền truy cập cảm biến để đếm bước chân.');
    }
  };

  const stopTracking = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    const distance = (stepCount * 0.000762).toFixed(2);
    onStop(stepCount, distance);
    setStepCount(0); // Reset stats
    setIsTracking(false);
  };


  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const km = (stepCount * 0.000762).toFixed(2);

  return (
    <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={styles.headerRow}>
        <IconSymbol name="figure.run" size={24} color={themeColors.tint} />
        <Text style={[styles.cardTitle, { color: themeColors.text, marginLeft: 8 }]}>Hoạt động</Text>
      </View>

      <View style={styles.mainDisplay}>
        <Text style={[styles.bigStat, { color: themeColors.tint }]}>{stepCount}</Text>
        <Text style={[styles.bigLabel, { color: themeColors.muted }]}>bước chân hôm nay</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statBox, { backgroundColor: themeColors.background }]}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{km}</Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>km</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: themeColors.background }]}>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{(stepCount * 0.04).toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>kcal</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isTracking ? themeColors.danger : themeColors.tint },
        ]}
        onPress={isTracking ? stopTracking : startTracking}
      >
        <Text style={styles.buttonText}>
          {isTracking ? 'Dừng theo dõi' : 'Bắt đầu chạy'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    minHeight: 380,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  mainDisplay: {
    alignItems: 'center',
    marginVertical: 10,
  },
  bigStat: {
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 70,
  },
  bigLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
