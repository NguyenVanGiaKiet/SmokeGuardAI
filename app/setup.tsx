import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';

const STORAGE_KEY = '@SmokeGuardAI:userData';

export default function SetupScreen() {
  const { activeScheme } = useTheme();
  const { t } = useLanguage();
  const themeColors = Colors[activeScheme];

  const [cigarettesInput, setCigarettesInput] = useState('10');
  const [yearsInput, setYearsInput] = useState('5');
  const [priceInput, setPriceInput] = useState('30000');
  const [quitTimeOffset, setQuitTimeOffset] = useState<'now' | '1h' | '3h' | '1d' | '3d'>('now');

  const handleSaveSetup = async () => {
    const cigs = parseInt(cigarettesInput, 10);
    const years = parseInt(yearsInput, 10);
    const price = parseInt(priceInput, 10);

    if (isNaN(cigs) || cigs <= 0) { Alert.alert('Lỗi', 'Vui lòng nhập số điếu thuốc hợp lệ.'); return; }
    if (isNaN(years) || years < 0) { Alert.alert('Lỗi', 'Vui lòng nhập số năm hợp lệ.'); return; }
    if (isNaN(price) || price <= 0) { Alert.alert('Lỗi', 'Vui lòng nhập giá tiền hợp lệ.'); return; }

    const date = new Date();
    if (quitTimeOffset === '1h') date.setHours(date.getHours() - 1);
    else if (quitTimeOffset === '3h') date.setHours(date.getHours() - 3);
    else if (quitTimeOffset === '1d') date.setDate(date.getDate() - 1);
    else if (quitTimeOffset === '3d') date.setDate(date.getDate() - 3);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        cigarettesPerDay: cigs,
        yearsSmoked: years,
        pricePerPack: price,
        quitDate: date.toISOString(),
      }));
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to save user data', e);
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu thiết lập.');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContainer, { backgroundColor: themeColors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.onboardingHeader}>
        <Text style={[styles.appTitle, { color: themeColors.tint }]}>{t('home.brand')}</Text>
        <Text style={[styles.appSub, { color: themeColors.muted }]}>
          Bắt đầu hành trình sống khỏe, trong lành không khói thuốc
        </Text>
      </View>

      <View style={[styles.setupCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <Text style={[styles.setupTitle, { color: themeColors.text }]}>{t('home.setupTitle')}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('home.setupCigarettes')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.textInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
              keyboardType="numeric"
              value={cigarettesInput}
              onChangeText={setCigarettesInput}
            />
            <Text style={[styles.inputUnit, { color: themeColors.muted }]}>{t('home.cigarettes')}</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('home.setupYears')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.textInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
              keyboardType="numeric"
              value={yearsInput}
              onChangeText={setYearsInput}
            />
            <Text style={[styles.inputUnit, { color: themeColors.muted }]}>{t('home.years')}</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('home.setupPrice')}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.textInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
            />
            <Text style={[styles.inputUnit, { color: themeColors.muted }]}>đ</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('home.setupQuitTime')}</Text>
          <View style={styles.offsetOptions}>
            {[
              { label: t('home.setupNow'), value: 'now' },
              { label: t('home.setup1h'), value: '1h' },
              { label: t('home.setup3h'), value: '3h' },
              { label: t('home.setup1d'), value: '1d' },
              { label: t('home.setup3d'), value: '3d' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.offsetBtn,
                  {
                    borderColor: themeColors.border,
                    backgroundColor: quitTimeOffset === opt.value ? themeColors.tint : themeColors.background,
                  },
                ]}
                onPress={() => setQuitTimeOffset(opt.value as any)}
              >
                <Text
                  style={[
                    styles.offsetBtnText,
                    {
                      color: quitTimeOffset === opt.value ? '#FFF' : themeColors.text,
                      fontWeight: quitTimeOffset === opt.value ? '700' : '400',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: themeColors.tint }]}
          onPress={handleSaveSetup}
        >
          <Text style={styles.primaryButtonText}>{t('home.setupStart')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    minHeight: '100%',
  },
  onboardingHeader: {
    marginBottom: 28,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  appSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  setupCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  inputUnit: {
    position: 'absolute',
    right: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  offsetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  offsetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  offsetBtnText: {
    fontSize: 13,
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
