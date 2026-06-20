import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

const STORAGE_KEY_LOGS = '@BreatheFree:cravingLogs';

interface CravingLog {
  id: string;
  timestamp: string;
  intensity: 'Low' | 'Medium' | 'High';
  trigger: string;
  notes: string;
}

export default function CravingsScreen() {
  const { activeScheme } = useTheme();
  const { t } = useLanguage();
  const themeColors = Colors[activeScheme];

  const INTENSITIES = [
    { label: t('cravings.intensityLow'), value: 'Low', color: '#10B981' },
    { label: t('cravings.intensityMedium'), value: 'Medium', color: '#F59E0B' },
    { label: t('cravings.intensityHigh'), value: 'High', color: '#F43F5E' },
  ];

  const TRIGGERS = [
    t('cravings.triggers.stress'),
    t('cravings.triggers.afterMeal'),
    t('cravings.triggers.coffeeAlcohol'),
    t('cravings.triggers.boredom'),
    t('cravings.triggers.habit'),
    t('cravings.triggers.friends'),
    t('cravings.triggers.other'),
  ];

  // Cravings Log States
  const [logs, setLogs] = useState<CravingLog[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedIntensity, setSelectedIntensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [selectedTrigger, setSelectedTrigger] = useState(TRIGGERS[0]);
  const [notesText, setNotesText] = useState('');

  // Breathing Helper States
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathCountdown, setBreathCountdown] = useState(0);

  // Animated scale for breathing bubble
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  const breathingTimerRef = useRef<any>(null);

  // Fetch logs on focus
  useFocusEffect(
    useCallback(() => {
      loadLogs();
      return () => {
        // Cleanup breathing when leaving screen
        stopBreathing();
      };
    }, [])
  );

  const loadLogs = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
      if (jsonValue != null) {
        setLogs(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Failed to load craving logs', e);
    }
  };

  const handleAddLog = async () => {
    const newLog: CravingLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      intensity: selectedIntensity,
      trigger: selectedTrigger,
      notes: notesText.trim(),
    };

    const updatedLogs = [newLog, ...logs];
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updatedLogs));
      setLogs(updatedLogs);
      setIsModalVisible(false);
      // Reset form
      setSelectedIntensity('Medium');
      setSelectedTrigger(TRIGGERS[0]);
      setNotesText('');
      Alert.alert(t('cravings.successAlertTitle'), t('cravings.successAlertMsg'));
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu nhật ký.');
    }
  };

  const handleDeleteLog = (id: string) => {
    Alert.alert(
      t('cravings.deleteAlertTitle'),
      t('cravings.deleteAlertMsg'),
      [
        { text: t('cravings.cancelAction'), style: 'cancel' },
        {
          text: t('cravings.deleteAction'),
          style: 'destructive',
          onPress: async () => {
            const updated = logs.filter((item) => item.id !== id);
            try {
              await AsyncStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
              setLogs(updated);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  // Breathing Logic (4-7-8 technique)
  const stopBreathing = () => {
    setIsBreathing(false);
    setBreathPhase('idle');
    setBreathCountdown(0);
    if (breathingTimerRef.current) clearInterval(breathingTimerRef.current);
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0.7, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const startBreathing = () => {
    setIsBreathing(true);
    runBreathingCycle();
  };

  const runBreathingCycle = () => {
    // 1. INHALE: 4 seconds
    setBreathPhase('inhale');
    setBreathCountdown(4);

    // Animate scale up to 1.8 and opacity up
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1.8, duration: 4000, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1.0, duration: 4000, useNativeDriver: true }),
    ]).start();

    let count = 4;
    const interval = setInterval(() => {
      count -= 1;
      setBreathCountdown(count);

      if (count <= 0) {
        clearInterval(interval);
        // 2. HOLD: 7 seconds
        setBreathPhase('hold');
        setBreathCountdown(7);
        
        let holdCount = 7;
        const holdInterval = setInterval(() => {
          holdCount -= 1;
          setBreathCountdown(holdCount);

          if (holdCount <= 0) {
            clearInterval(holdInterval);
            // 3. EXHALE: 8 seconds
            setBreathPhase('exhale');
            setBreathCountdown(8);

            // Animate scale down to 1.0 and opacity down
            Animated.parallel([
              Animated.timing(scaleAnim, { toValue: 1.0, duration: 8000, useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 0.6, duration: 8000, useNativeDriver: true }),
            ]).start();

            let exhaleCount = 8;
            const exhaleInterval = setInterval(() => {
              exhaleCount -= 1;
              setBreathCountdown(exhaleCount);

              if (exhaleCount <= 0) {
                clearInterval(exhaleInterval);
                // Restart cycle if still breathing
                runBreathingCycle();
              }
            }, 1000);
            breathingTimerRef.current = exhaleInterval;
          }
        }, 1000);
        breathingTimerRef.current = holdInterval;
      }
    }, 1000);
    breathingTimerRef.current = interval;
  };

  // Keep track of the current timer for cleanup
  useEffect(() => {
    return () => {
      if (breathingTimerRef.current) clearInterval(breathingTimerRef.current);
    };
  }, []);

  const renderLogItem = ({ item }: { item: CravingLog }) => {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('vi-VN');
    const intensityColor =
      item.intensity === 'Low' ? '#10B981' : item.intensity === 'Medium' ? '#F59E0B' : '#F43F5E';
    const intensityLabel =
      item.intensity === 'Low' ? t('cravings.intensityLow') : item.intensity === 'Medium' ? t('cravings.intensityMedium') : t('cravings.intensityHigh');

    return (
      <View style={[styles.logCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.logHeader}>
          <View style={styles.logMeta}>
            <Text style={[styles.logTime, { color: themeColors.text }]}>{timeStr} - {dateStr}</Text>
            <View style={[styles.intensityTag, { backgroundColor: intensityColor + '15' }]}>
              <Text style={[styles.intensityText, { color: intensityColor }]}>{intensityLabel}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDeleteLog(item.id)} style={styles.deleteBtn}>
            <IconSymbol size={18} name="chevron.right" color={themeColors.danger} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.logTrigger, { color: themeColors.text }]}>{t('cravings.logTrigger')} {item.trigger}</Text>
        {item.notes ? (
          <Text style={[styles.logNotes, { color: themeColors.muted }]}>{t('cravings.logNotes')} {item.notes}</Text>
        ) : null}
      </View>
    );
  };

  // Get current instruction for breathing bubble
  const getBreathingText = () => {
    switch (breathPhase) {
      case 'inhale':
        return t('cravings.breathingInhale');
      case 'hold':
        return t('cravings.breathingHold');
      case 'exhale':
        return t('cravings.breathingExhale');
      default:
        return t('cravings.breathingIdle');
    }
  };

  const getPhaseColor = () => {
    switch (breathPhase) {
      case 'inhale':
        return '#0EA5E9'; // Sky
      case 'hold':
        return '#F59E0B'; // Amber
      case 'exhale':
        return '#10B981'; // Emerald
      default:
        return themeColors.tint;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('cravings.title')}</Text>
        <Text style={[styles.headerSub, { color: themeColors.muted }]}>
          {t('cravings.subtitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Breathing Assistant Card */}
        <View style={[styles.breathingCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('cravings.breathingTitle')}</Text>
          <Text style={[styles.cardSub, { color: themeColors.muted }]}>
            {t('cravings.breathingDesc')}
          </Text>

          {/* Breathing Bubble Area */}
          <View style={styles.bubbleArea}>
            <Animated.View
              style={[
                styles.breathingBubble,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                  backgroundColor: getPhaseColor() + '20',
                  borderColor: getPhaseColor(),
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.innerBubble,
                  {
                    backgroundColor: getPhaseColor(),
                  },
                ]}
              >
                {isBreathing ? (
                  <View style={styles.bubbleContent}>
                    <Text style={styles.bubblePhaseText}>{getBreathingText()}</Text>
                    <Text style={styles.bubbleCountText}>{breathCountdown}</Text>
                  </View>
                ) : (
                  <IconSymbol size={32} name="leaf.fill" color="#FFF" />
                )}
              </Animated.View>
            </Animated.View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.breathingBtn,
              { backgroundColor: isBreathing ? themeColors.danger : themeColors.tint },
            ]}
            onPress={isBreathing ? stopBreathing : startBreathing}
          >
            <Text style={styles.breathingBtnText}>
              {isBreathing ? t('cravings.breathingBtnStop') : t('cravings.breathingBtnStart')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cravings Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('cravings.logsTitle')}</Text>
          <TouchableOpacity
            style={[styles.addLogBtn, { backgroundColor: themeColors.tint + '15' }]}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={[styles.addLogBtnText, { color: themeColors.tint }]}>{t('cravings.addLog')}</Text>
          </TouchableOpacity>
        </View>

        {logs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <IconSymbol size={28} name="leaf.fill" color={themeColors.muted} />
            <Text style={[styles.emptyText, { color: themeColors.muted }]}>
              {t('cravings.emptyLogs')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={logs.slice(0, 5)} // Show recent 5 logs
            keyExtractor={(item) => item.id}
            renderItem={renderLogItem}
            scrollEnabled={false}
            contentContainerStyle={styles.logsList}
          />
        )}
      </ScrollView>

      {/* Log Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>{t('cravings.modalTitle')}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={[styles.closeModalText, { color: themeColors.muted }]}>{t('cravings.modalClose')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Intensity Picker */}
              <Text style={[styles.formLabel, { color: themeColors.text }]}>{t('cravings.logIntensity')}</Text>
              <View style={styles.intensityContainer}>
                {INTENSITIES.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.intensityOption,
                      {
                        borderColor: selectedIntensity === opt.value ? opt.color : themeColors.border,
                        backgroundColor: selectedIntensity === opt.value ? opt.color + '15' : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedIntensity(opt.value as any)}
                  >
                    <Text
                      style={[
                        styles.intensityOptionText,
                        {
                          color: selectedIntensity === opt.value ? opt.color : themeColors.text,
                          fontWeight: selectedIntensity === opt.value ? '700' : '400',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Trigger Picker */}
              <Text style={[styles.formLabel, { color: themeColors.text }]}>{t('cravings.logTrigger')}</Text>
              <View style={styles.triggerContainer}>
                {TRIGGERS.map((trigger) => (
                  <TouchableOpacity
                    key={trigger}
                    style={[
                      styles.triggerOption,
                      {
                        borderColor: selectedTrigger === trigger ? themeColors.tint : themeColors.border,
                        backgroundColor: selectedTrigger === trigger ? themeColors.tint + '15' : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedTrigger(trigger)}
                  >
                    <Text
                      style={[
                        styles.triggerOptionText,
                        {
                          color: selectedTrigger === trigger ? themeColors.tint : themeColors.text,
                          fontWeight: selectedTrigger === trigger ? '700' : '500',
                        },
                      ]}
                    >
                      {trigger}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes Input */}
              <Text style={[styles.formLabel, { color: themeColors.text }]}>{t('cravings.logNotes')}</Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    color: themeColors.text,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                  },
                ]}
                placeholder={t('cravings.notesPlaceholder')}
                placeholderTextColor={themeColors.muted}
                multiline
                numberOfLines={3}
                value={notesText}
                onChangeText={setNotesText}
              />

              <TouchableOpacity
                style={[styles.saveLogBtn, { backgroundColor: themeColors.tint }]}
                onPress={handleAddLog}
              >
                <Text style={styles.saveLogBtnText}>{t('cravings.saveLog')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  breathingCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  bubbleArea: {
    height: 180,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  breathingBubble: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bubbleContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubblePhaseText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bubbleCountText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  breathingBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  addLogBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addLogBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  logsList: {
    gap: 12,
  },
  logCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  intensityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 2,
  },
  logTrigger: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  logNotes: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeModalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalForm: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  intensityContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  intensityOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityOptionText: {
    fontSize: 13,
  },
  triggerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  triggerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  triggerOptionText: {
    fontSize: 12,
  },
  notesInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 24,
    minHeight: 80,
    fontWeight: '500',
  },
  saveLogBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  saveLogBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
