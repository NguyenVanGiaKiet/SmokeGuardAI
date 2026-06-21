import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { scheduleDailyReminder } from '@/utils/notifications';
import { calculateSmokingRisk, CravingLog } from '@/utils/ai-predictor';

const { width } = Dimensions.get('window');

interface UserData {
  cigarettesPerDay: number;
  yearsSmoked: number;
  pricePerPack: number;
  quitDate: string;
}

const STORAGE_KEY = '@SmokeGuardAI:userData';
const STORAGE_KEY_LOGS = '@SmokeGuardAI:cravingLogs';

// Streak is reset to 0 if the user hasn't opened the app for more than this long
const STREAK_RESET_THRESHOLD_MS = 24 * 60 * 60 * 1000;
// Minimum streak (in days) required for the flame icon/text to show as "active" (colored)
const STREAK_ACTIVE_THRESHOLD_DAYS = 3;

// Calculate streak (in days quit) from the quit date
const calculateStreak = (quitDate: string) => {
  const quitTime = new Date(quitDate);
  const now = new Date();

  // Zero out time-of-day so we count full calendar days
  const quitMidnight = new Date(quitTime);
  quitMidnight.setHours(0, 0, 0, 0);
  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);

  const diffTime = nowMidnight.getTime() - quitMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

export default function HomeScreen() {
  const { activeScheme } = useTheme();
  const { language, t } = useLanguage();
  const themeColors = Colors[activeScheme];

  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Real-time counter states
  const [timeElapsed, setTimeElapsed] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [quoteIndex, setQuoteIndex] = useState(0);

  const quotes = t('home.quotes') as unknown as string[];

  // State for last opened date. null = "still loading", undefined-like sentinel handled via isLastOpenedLoaded
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  const [isLastOpenedLoaded, setIsLastOpenedLoaded] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<any>(null);

  useEffect(() => {
    const getLastOpened = async () => {
      const last = await AsyncStorage.getItem('@SmokeGuardAI:lastOpened');
      setLastOpened(last);
      setIsLastOpenedLoaded(true);
      await AsyncStorage.setItem('@SmokeGuardAI:lastOpened', new Date().toISOString());
    };
    getLastOpened();
  }, []);

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  // Redirect to setup if no user data
  useEffect(() => {
    if (!isLoading && !userData) {
      router.replace('/setup');
    }
  }, [isLoading, userData]);

  // Rotate quote every 15 seconds
  useEffect(() => {
    scheduleDailyReminder();
    const quoteInterval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 15000);
    return () => clearInterval(quoteInterval);
  }, [quotes]);

  // Update counter every second
  useEffect(() => {
    if (!userData) return;

    const updateCounter = () => {
      const quitTime = new Date(userData.quitDate).getTime();
      const now = Date.now();
      const diffMs = now - quitTime;

      if (diffMs < 0) {
        setTimeElapsed({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const d = Math.floor(diffSecs / (3600 * 24));
      const h = Math.floor((diffSecs % (3600 * 24)) / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);
      const s = diffSecs % 60;

      setTimeElapsed({ d, h, m, s });
    };

    updateCounter();
    const counterInterval = setInterval(updateCounter, 1000);
    return () => clearInterval(counterInterval);
  }, [userData]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        setUserData(JSON.parse(jsonValue));
      }
      
      // Calculate risk
      const logsJson = await AsyncStorage.getItem(STORAGE_KEY_LOGS);
      const logs: CravingLog[] = logsJson ? JSON.parse(logsJson) : [];
      if (jsonValue) {
        const user = JSON.parse(jsonValue);
        setRiskAssessment(calculateSmokingRisk(logs, user.quitDate));
      }
    } catch (e) {
      console.error('Failed to load user data', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Single source of truth for the streak value, recalculated only when its inputs change.
  // While lastOpened hasn't finished loading yet, we hold off so we never flash a wrong value.
  const currentStreak = useMemo(() => {
    if (!userData || !isLastOpenedLoaded) return 0;
    return calculateStreak(userData.quitDate);
  }, [userData, isLastOpenedLoaded]);

  const isStreakActive = currentStreak >= STREAK_ACTIVE_THRESHOLD_DAYS;

  if (isLoading || !userData) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  // DASHBOARD SCREEN
  // Calculations
  const quitDateObj = new Date(userData.quitDate);
  const diffMs = Date.now() - quitDateObj.getTime();
  const daysQuit = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  const cigarettesAvoided = Math.max(0, Math.floor(daysQuit * userData.cigarettesPerDay));
  const moneySaved = Math.max(0, Math.floor(daysQuit * (userData.cigarettesPerDay / 20) * userData.pricePerPack));
  const lifeRegainedMinutes = cigarettesAvoided * 11;

  const formatLifeRegained = (mins: number) => {
    if (mins < 60) return `${mins} ${t('home.minutes')}`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs < 24) return `${hrs} ${t('home.hours')} ${remainingMins} ${t('home.minutes')}`;
    const days = Math.floor(hrs / 24);
    const remainingHrs = hrs % 24;
    return `${days} ${t('home.days')} ${remainingHrs} ${t('home.hours')}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(val);
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, { color: themeColors.muted }]}>{t('home.welcome')}</Text>
          <Text style={[styles.dashboardBrand, { color: themeColors.text }]}>{t('home.brand')}</Text>
        </View>
        <View style={[styles.avatarCircle, { backgroundColor: themeColors.tint + '20' }]}>
          <IconSymbol size={24} name="leaf.fill" color={themeColors.tint} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.dashboardScroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Streak Card */}
        <View
          style={[
            styles.streakCard,
            {
              backgroundColor: themeColors.card,
              borderColor: isStreakActive ? themeColors.tint : themeColors.border,
            },
          ]}
        >
          <View style={styles.streakInfo}>
            <View style={styles.streakHeader}>
              <IconSymbol
                size={24}
                name="flame.fill"
                color={isStreakActive ? themeColors.tint : themeColors.muted}
              />
              <Text style={[styles.streakTitle, { color: themeColors.text, marginLeft: 8 }]}>
                {t('home.streakTitle') || 'Streaks'}
              </Text>
            </View>
            <Text style={[styles.streakDays, { color: isStreakActive ? themeColors.tint : themeColors.text }]}>
              {currentStreak} {t('home.days') || 'days'}
            </Text>
          </View>
        </View>

        {/* Risk Assessment Card */}
        {riskAssessment && (() => {
          const riskColor =
            riskAssessment.level === 'High'
              ? themeColors.danger
              : riskAssessment.level === 'Medium'
              ? themeColors.warning
              : themeColors.primary;

          const levelKey = 
            riskAssessment.level === 'High' ? 'riskHigh' : 
            riskAssessment.level === 'Medium' ? 'riskMedium' : 'riskLow';
            
          const msgKey =
            riskAssessment.level === 'High' ? 'riskHighMsg' : 
            riskAssessment.level === 'Medium' ? 'riskMediumMsg' : 'riskLowMsg';

          return (
            <View
              style={[
                styles.riskCard,
                {
                  backgroundColor: themeColors.card,
                  borderColor: riskColor,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>{t('home.riskTitle')}</Text>
              <Text style={{ color: themeColors.text }}>
                {t('home.riskLevel')}{' '}
                <Text style={{ color: riskColor, fontWeight: 'bold' }}>
                  {t(`home.${levelKey}`)}
                </Text>
              </Text>
              <Text style={{ color: themeColors.muted }}>{t(`home.${msgKey}`)}</Text>
            </View>
          );
        })()}

        {/* Counter Card */}
        <View style={[styles.counterCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={styles.counterHeader}>{t('home.timerHeader')}</Text>
          <View style={styles.timerGrid}>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerNum, { color: themeColors.tint }]}>{timeElapsed.d}</Text>
              <Text style={[styles.timerLabel, { color: themeColors.muted }]}>{t('home.days')}</Text>
            </View>
            <View style={styles.timerSeparator}>
              <Text style={[styles.timerSepText, { color: themeColors.tint }]}>:</Text>
            </View>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerNum, { color: themeColors.tint }]}>{timeElapsed.h}</Text>
              <Text style={[styles.timerLabel, { color: themeColors.muted }]}>{t('home.hours')}</Text>
            </View>
            <View style={styles.timerSeparator}>
              <Text style={[styles.timerSepText, { color: themeColors.tint }]}>:</Text>
            </View>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerNum, { color: themeColors.tint }]}>{timeElapsed.m}</Text>
              <Text style={[styles.timerLabel, { color: themeColors.muted }]}>{t('home.minutes')}</Text>
            </View>
            <View style={styles.timerSeparator}>
              <Text style={[styles.timerSepText, { color: themeColors.tint }]}>:</Text>
            </View>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerNum, { color: themeColors.tint }]}>{timeElapsed.s}</Text>
              <Text style={[styles.timerLabel, { color: themeColors.muted }]}>{t('home.seconds')}</Text>
            </View>
          </View>
          <View style={[styles.quitBadge, { backgroundColor: themeColors.tint + '15' }]}>
            <Text style={[styles.quitBadgeText, { color: themeColors.tint }]}>
              {t('home.startDate')} {quitDateObj.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')} {quitDateObj.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Grid Stats */}
        <View style={styles.statsGrid}>
          {/* Stat 1: Money saved */}
          <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#10B98120' }]}>
              <IconSymbol size={20} name="banknote.fill" color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {formatCurrency(moneySaved)}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>{t('home.moneySaved')}</Text>
          </View>

          {/* Stat 2: Cigarettes avoided */}
          <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#F59E0B20' }]}>
              <IconSymbol size={20} name="shield.fill" color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {cigarettesAvoided} {t('home.cigarettes')}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>{t('home.cigarettesAvoided')}</Text>
          </View>
        </View>

        {/* Large Stat Box: Life Regained */}
        <View style={[styles.largeStatCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: '#0EA5E920' }]}>
            <IconSymbol size={22} name="hourglass.fill" color="#0EA5E9" />
          </View>
          <View style={styles.largeStatInfo}>
            <Text style={[styles.largeStatValue, { color: themeColors.text }]}>
              +{formatLifeRegained(lifeRegainedMinutes)}
            </Text>
            <Text style={[styles.largeStatLabel, { color: themeColors.muted }]}>
              {t('home.lifeRegainedDesc')}
            </Text>
          </View>
        </View>

        {/* Motivational Quote Card */}
        <View style={[styles.quoteCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <IconSymbol
            size={22}
            name="message.fill"
            color={themeColors.tint}
            style={styles.quoteIcon}
          />
          <Text style={[styles.quoteText, { color: themeColors.text }]}>
            {quotes[quoteIndex]}
          </Text>
        </View>

        {/* Tips / Info Banner */}
        <View style={[styles.tipsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.tipHeader}>
            <IconSymbol size={20} name="heart.fill" color={themeColors.tint} />
            <Text style={[styles.tipTitle, { color: themeColors.text }]}>{t('home.tipsTitle')}</Text>
          </View>
          <Text style={[styles.tipBody, { color: themeColors.muted }]}>
            {t('home.tipsBody')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  dashboardScroll: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dashboardBrand: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  counterHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#94A3B8',
    marginBottom: 16,
  },
  timerGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerBlock: {
    alignItems: 'center',
    minWidth: 54,
  },
  timerNum: {
    fontSize: 32,
    fontWeight: '800',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  timerSeparator: {
    paddingHorizontal: 4,
    paddingBottom: 14,
  },
  timerSepText: {
    fontSize: 28,
    fontWeight: '800',
  },
  quitBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  largeStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  largeStatInfo: {
    marginLeft: 14,
    flex: 1,
  },
  largeStatValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  largeStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  quoteCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteIcon: {
    marginRight: 12,
  },
  quoteText: {
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    fontWeight: '600',
  },
  tipsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  streakCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  streakInfo: {
    alignItems: 'center',
    gap: 4,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakDays: {
    fontSize: 32,
    fontWeight: '900',
  },
  riskCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
});
