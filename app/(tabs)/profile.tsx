import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Notifications from 'expo-notifications';
import { useFonts, Kalam_700Bold } from '@expo-google-fonts/kalam';

const STORAGE_KEY = '@SmokeGuardAI:userData';
const STORAGE_KEY_LOGS = '@SmokeGuardAI:cravingLogs';
const STORAGE_KEY_RUNS = '@SmokeGuardAI:runLogs';

interface UserData {
  cigarettesPerDay: number;
  yearsSmoked: number;
  pricePerPack: number;
  quitDate: string;
}

export default function ProfileScreen() {
  const { themeMode, activeScheme, setThemeMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const themeColors = Colors[activeScheme];

  const [fontsLoaded] = useFonts({
    Kalam_700Bold,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [cravingsCount, setCravingsCount] = useState(0);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [cigarettesInput, setCigarettesInput] = useState('');
  const [yearsInput, setYearsInput] = useState('');
  const [priceInput, setPriceInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        const data: UserData = JSON.parse(jsonValue);
        setUserData(data);
        setCigarettesInput(data.cigarettesPerDay.toString());
        setYearsInput(data.yearsSmoked.toString());
        setPriceInput(data.pricePerPack.toString());
      } else {
        setUserData(null);
      }

      // Load cravings count
      const logsJson = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
      if (logsJson != null) {
        setCravingsCount(JSON.parse(logsJson).length);
      } else {
        setCravingsCount(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const cigs = parseInt(cigarettesInput, 10);
    const years = parseInt(yearsInput, 10);
    const price = parseInt(priceInput, 10);

    if (isNaN(cigs) || cigs <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điếu thuốc hợp lệ.');
      return;
    }
    if (isNaN(years) || years < 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số năm hợp lệ.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá tiền hợp lệ.');
      return;
    }

    if (!userData) return;

    const updatedData: UserData = {
      ...userData,
      cigarettesPerDay: cigs,
      yearsSmoked: years,
      pricePerPack: price,
    };

    try {
      setIsLoading(true);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      setUserData(updatedData);
      setIsEditing(false);
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelapse = () => {
    Alert.alert(
      'Đặt lại hành trình',
      'Đừng nản lòng! Vấp ngã là một phần của quá trình cai thuốc thành công. Bạn muốn đặt lại bộ đếm thời gian từ thời điểm này chứ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt lại ngay',
          style: 'destructive',
          onPress: async () => {
            if (!userData) return;
            const updatedData: UserData = {
              ...userData,
              quitDate: new Date().toISOString(),
            };
            try {
              setIsLoading(true);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
              await AsyncStorage.removeItem(STORAGE_KEY_LOGS);
              setUserData(updatedData);
              setCravingsCount(0);
              Alert.alert('Hành trình mới bắt đầu!', 'Hít thở sâu. Bạn hoàn toàn có thể làm được!');
            } catch (e) {
              console.error(e);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };


  if (isLoading || !fontsLoaded) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background, padding: 24 }]}>
        <IconSymbol size={48} name="person.fill" color={themeColors.muted} />
        <Text style={[styles.noDataTitle, { color: themeColors.text }]}>Chưa Thiết Lập</Text>
        <Text style={[styles.noDataDesc, { color: themeColors.muted }]}>
          Vui lòng thiết lập thông tin tại trang chủ trước khi xem trang cá nhân.
        </Text>
      </View>
    );
  }

  const quitDateObj = new Date(userData.quitDate);
  const diffMs = Date.now() - quitDateObj.getTime();
  const daysQuit = Math.max(0, diffMs / (1000 * 60 * 60 * 24));

  const badgeColors = ['blue', 'yellow', 'red']; // Colors for 3, 7, 30 days
  const badges = (t('profile.badges') as any[]).map((b, i) => {
    const daysRequired = [3, 7, 30][i];
    return { ...b, earned: daysQuit >= daysRequired, daysRequired, iconColor: badgeColors[i] };
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('profile.title')}</Text>
        <Text style={[styles.headerSub, { color: themeColors.muted }]}>
          {t('profile.subtitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Badges Section */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('profile.badgesTitle')}</Text>
          <View style={styles.badgesContainer}>
            {badges.map((badge) => (
              <TouchableOpacity
                key={badge.id}
                style={styles.badgeWrapper}
                onLongPress={() => Alert.alert(badge.title, badge.desc)}
              >
                <View
                  style={[
                    styles.badgeItem,
                    {
                      backgroundColor: badge.earned ? themeColors.tint + '15' : themeColors.border + '30',
                      borderColor: badge.earned ? themeColors.tint : themeColors.border,
                    },
                  ]}
                >
                  <View style={styles.badgeIconStack}>
                    <View style={styles.badgeIconWrap} pointerEvents="none">
                      <IconSymbol
                        size={60}
                        name={badge.icon}
                        color={badge.earned ? badge.iconColor : themeColors.muted}
                      />
                    </View>
                  </View>
                </View>

                <Text
                  style={[
                    styles.badgeTitle,
                    { color: badge.earned ? themeColors.tint : themeColors.muted },
                  ]}
                >
                  {badge.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Profile Stats Summary */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('profile.totalOverview')}</Text>

          <View style={styles.rowItem}>
            <Text style={[styles.rowLabel, { color: themeColors.muted }]}>{t('profile.startDate')}</Text>
            <Text style={[styles.rowValue, { color: themeColors.text }]}>
              {quitDateObj.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')} {quitDateObj.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={[styles.rowLabel, { color: themeColors.muted }]}>{t('profile.cravingsCount')}</Text>
            <Text style={[styles.rowValue, { color: themeColors.text, fontWeight: '700' }]}>
              {cravingsCount} {t('profile.times')}
            </Text>
          </View>
        </View>

        {/* Language Toggle Card */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('profile.languageTitle')}</Text>
          <View style={styles.themeToggleContainer}>
            {[
              { label: 'Tiếng Việt', value: 'vi' },
              { label: 'English', value: 'en' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[
                  styles.themeOption,
                  {
                    borderColor: language === lang.value ? themeColors.tint : themeColors.border,
                    backgroundColor: language === lang.value ? themeColors.tint + '15' : 'transparent',
                  },
                ]}
                onPress={() => setLanguage(lang.value as any)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: language === lang.value ? themeColors.tint : themeColors.text,
                      fontWeight: language === lang.value ? '700' : '500',
                    },
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Theme Card */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('profile.theme')}</Text>
          <View style={styles.themeToggleContainer}>
            {[
              { label: t('profile.themeLight'), value: 'light' },
              { label: t('profile.themeDark'), value: 'dark' },
              { label: t('profile.themeSystem'), value: 'system' },
            ].map((mode) => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.themeOption,
                  {
                    borderColor: themeMode === mode.value ? themeColors.tint : themeColors.border,
                    backgroundColor: themeMode === mode.value ? themeColors.tint + '15' : 'transparent',
                  },
                ]}
                onPress={() => setThemeMode(mode.value as any)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: themeMode === mode.value ? themeColors.tint : themeColors.text,
                      fontWeight: themeMode === mode.value ? '700' : '500',
                    },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Edit Info Section */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.cardHeaderWithBtn}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('profile.smokingStats')}</Text>
            {!isEditing ? (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={[styles.editBtn, { backgroundColor: themeColors.tint + '15' }]}
              >
                <Text style={[styles.editBtnText, { color: themeColors.tint }]}>{t('profile.edit')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={[styles.editBtn, { backgroundColor: themeColors.border }]}
              >
                <Text style={[styles.editBtnText, { color: themeColors.text }]}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('profile.cigarettesPerDay')}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: themeColors.text,
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                    },
                  ]}
                  keyboardType="numeric"
                  value={cigarettesInput}
                  onChangeText={setCigarettesInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('profile.yearsSmoked')}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: themeColors.text,
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                    },
                  ]}
                  keyboardType="numeric"
                  value={yearsInput}
                  onChangeText={setYearsInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>{t('profile.pricePerPack')}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: themeColors.text,
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                    },
                  ]}
                  keyboardType="numeric"
                  value={priceInput}
                  onChangeText={setPriceInput}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: themeColors.tint }]}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.saveBtnText}>{t('profile.save')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.rowItem}>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>{t('profile.cigarettesPerDay')}</Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {userData.cigarettesPerDay}
                </Text>
              </View>
              <View style={styles.rowItem}>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>{t('profile.yearsSmoked')}</Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {userData.yearsSmoked}
                </Text>
              </View>
              <View style={styles.rowItem}>
                <Text style={[styles.rowLabel, { color: themeColors.muted }]}>{t('profile.pricePerPack')}</Text>
                <Text style={[styles.rowValue, { color: themeColors.text }]}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(userData.pricePerPack)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Relapse Assistance (Reset) Card */}
        <View style={[styles.relapseCard, { borderColor: themeColors.danger + '40', backgroundColor: themeColors.card }]}>
          <View style={styles.relapseHeader}>
            <IconSymbol size={22} name="leaf.fill" color={themeColors.danger} />
            <Text style={[styles.relapseTitle, { color: themeColors.text }]}>{t('profile.relapseTitle')}</Text>
          </View>
          <Text style={[styles.relapseDesc, { color: themeColors.muted }]}>
            {t('profile.relapseDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.relapseBtn, { backgroundColor: themeColors.danger }]}
            onPress={handleRelapse}
          >
            <Text style={styles.relapseBtnText}>{t('profile.relapseBtn')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
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
    gap: 16,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeWrapper: {
    flex: 1,
    minWidth: '28%',
    alignItems: 'center',
    gap: 6,
  },
  badgeItem: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  badgeIconStack: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#94A3B830',
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardHeaderWithBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formContainer: {
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  relapseCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
  },
  relapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  relapseTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  relapseDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    fontWeight: '500',
  },
  relapseBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  relapseBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  themeToggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: 13,
  },
});