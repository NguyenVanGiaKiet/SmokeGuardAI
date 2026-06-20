import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Donut tự vẽ bằng SVG, animate bằng Animated.timing — chạy lại mỗi khi
// `replayKey` thay đổi (ví dụ mỗi lần tab được focus).
function AnimatedDonut({
  percent,
  size,
  strokeWidth,
  trackColor,
  progressColor,
  replayKey,
  centerLabel,
}: {
  percent: number;
  size: number;
  strokeWidth: number;
  trackColor: string;
  progressColor: string;
  replayKey: number;
  centerLabel: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const lastReplayKey = useRef<number | null>(null);

  React.useEffect(() => {
    const isReplay = lastReplayKey.current !== replayKey;
    lastReplayKey.current = replayKey;

    if (isReplay) {
      // Vào tab (hoặc lần mount đầu) -> reset về 0 rồi vẽ lại từ đầu.
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: Math.max(0, Math.min(100, percent)),
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // strokeDashoffset không được native driver hỗ trợ
      }).start();
    } else {
      // % tự nhích lên theo thời gian thực (do interval cập nhật đồng hồ) ->
      // chỉ trượt nhẹ tới giá trị mới, không reset/replay lại từ đầu.
      Animated.timing(animatedValue, {
        toValue: Math.max(0, Math.min(100, percent)),
        duration: 400,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [percent, replayKey, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.donutCenter}>{centerLabel}</View>
      </View>
    </View>
  );
}

const STORAGE_KEY = '@BreatheFree:userData';

interface UserData {
  quitDate: string;
}

interface Milestone {
  id: string;
  title: string;
  durationMs: number;
  durationText: string;
  description: string;
}

const HEALTH_MILESTONES: Milestone[] = [
  {
    id: '1',
    title: 'Huyết áp & Nhịp tim',
    durationMs: 20 * 60 * 1000,
    durationText: '20 phút',
    description: 'Huyết áp và nhịp tim của bạn bắt đầu giảm trở lại mức bình thường. Các chi bắt đầu ấm lên.',
  },
  {
    id: '2',
    title: 'Khí Carbon Monoxide',
    durationMs: 8 * 60 * 60 * 1000,
    durationText: '8 giờ',
    description: 'Nồng độ khí CO độc hại trong máu giảm một nửa. Nồng độ oxy trong máu phục hồi về mức bình thường.',
  },
  {
    id: '3',
    title: 'Thải lọc CO hoàn toàn',
    durationMs: 24 * 60 * 60 * 1000,
    durationText: '1 ngày',
    description: 'Carbon monoxide được đào thải hoàn toàn khỏi cơ thể. Phổi bắt đầu quá trình tự làm sạch chất độc và đờm bám.',
  },
  {
    id: '4',
    title: 'Đào thải hoàn toàn Nicotine',
    durationMs: 48 * 60 * 60 * 1000,
    durationText: '2 ngày',
    description: 'Toàn bộ chất nicotine đã được lọc bỏ. Vị giác và khứu giác của bạn bắt đầu nhạy bén và ăn uống ngon miệng hơn.',
  },
  {
    id: '5',
    title: 'Hít thở Dễ dàng',
    durationMs: 72 * 60 * 60 * 1000,
    durationText: '3 ngày',
    description: 'Các ống phế quản trong phổi bắt đầu giãn ra và thư thái. Dung tích phổi tăng lên, giúp thở sâu nhẹ nhàng.',
  },
  {
    id: '6',
    title: 'Tuần hoàn Máu & Thể lực',
    durationMs: 2 * 7 * 24 * 60 * 60 * 1000,
    durationText: '2 tuần',
    description: 'Hệ tuần hoàn máu cải thiện rõ rệt khắp cơ thể. Các hoạt động thể chất, đi bộ hay chạy bộ bắt đầu ít bị mệt hơn.',
  },
  {
    id: '7',
    title: 'Chức năng Phổi khỏe mạnh',
    durationMs: 3 * 30 * 24 * 60 * 60 * 1000,
    durationText: '3 tháng',
    description: 'Chức năng lọc và hấp thụ oxy của phổi tăng lên đến 10%. Các triệu chứng ho khan, khò khè giảm rõ rệt.',
  },
  {
    id: '8',
    title: 'Giảm nguy cơ Bệnh tim',
    durationMs: 365 * 24 * 60 * 60 * 1000,
    durationText: '1 năm',
    description: 'Nguy cơ mắc bệnh tim mạch vành và nhồi máu cơ tim giảm đi một nửa so với thời điểm bạn còn hút thuốc.',
  },
  {
    id: '9',
    title: 'Ngừa Đột quỵ',
    durationMs: 5 * 365 * 24 * 60 * 60 * 1000,
    durationText: '5 năm',
    description: 'Nguy cơ đột quỵ được giảm thiểu đáng kể, trở lại mức tương đương như một người chưa từng hút thuốc lá.',
  },
  {
    id: '10',
    title: 'Ngăn ngừa Ung thư Phổi',
    durationMs: 10 * 365 * 24 * 60 * 60 * 1000,
    durationText: '10 năm',
    description: 'Nguy cơ tử vong do ung thư phổi giảm xuống một nửa. Nguy cơ mắc các bệnh ung thư vòm họng, thực quản cũng giảm mạnh.',
  },
];

// Reference points used to interpolate overall recovery percentage.
// Khớp 1-1 với 10 mốc trong HEALTH_MILESTONES — mỗi mốc đạt được sẽ cộng thêm 10%,
// để biểu đồ donut và 2 hàng "mức thời gian / % đạt được" luôn đồng bộ với danh sách mốc bên dưới.
const PROGRESS_POINTS = [
  { x: 0, y: 0, label: '0' },
  { x: 20 / (60 * 24), y: 10, label: '20 phút' }, // 20 phút
  { x: 8 / 24, y: 20, label: '8 giờ' }, // 8 giờ
  { x: 1, y: 30, label: '1 ngày' }, // 24 giờ
  { x: 2, y: 40, label: '2 ngày' }, // 48 giờ
  { x: 3, y: 50, label: '3 ngày' }, // 72 giờ
  { x: 14, y: 60, label: '2 tuần' }, // 2 tuần
  { x: 90, y: 70, label: '3 tháng' }, // 3 tháng
  { x: 365, y: 80, label: '1 năm' }, // 1 năm
  { x: 1825, y: 90, label: '5 năm' }, // 5 năm
  { x: 3650, y: 100, label: '10 năm' }, // 10 năm
];

// Các mốc hiển thị thành 2 hàng (thời gian / % đạt được) bên dưới số ngày không hút thuốc.
const DISPLAY_LEVELS = PROGRESS_POINTS.filter((p) => p.x > 0);

export default function HealthScreen() {
  const { activeScheme } = useTheme();
  const { t } = useLanguage();
  const themeColors = Colors[activeScheme];

  const [isLoading, setIsLoading] = useState(true);
  const [quitDate, setQuitDate] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState(Date.now());
  const [chartKey, setChartKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchQuitDate = async () => {
        try {
          if (isActive) setIsLoading(true);
          const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
          if (jsonValue != null && isActive) {
            const data: UserData = JSON.parse(jsonValue);
            setQuitDate(data.quitDate);
          } else if (isActive) {
            setQuitDate(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      fetchQuitDate();
      setChartKey((k) => k + 1);

      const timer = setInterval(() => {
        if (isActive) setNowTime(Date.now());
      }, 5000);

      return () => {
        isActive = false;
        clearInterval(timer);
      };
    }, [])
  );

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  if (!quitDate) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: themeColors.background, padding: 24 }]}>
        <IconSymbol size={48} name="heart.fill" color={themeColors.muted} />
        <Text style={[styles.noDataTitle, { color: themeColors.text }]}>Chưa Có Dữ Liệu</Text>
        <Text style={[styles.noDataDesc, { color: themeColors.muted }]}>
          Vui lòng thiết lập thông tin hút thuốc của bạn tại trang chủ để chúng tôi tính toán tiến trình hồi phục sức khỏe.
        </Text>
      </View>
    );
  }

  const quitTimeMs = new Date(quitDate).getTime();
  const timeElapsedMs = Math.max(0, nowTime - quitTimeMs);
  const daysQuit = timeElapsedMs / (1000 * 60 * 60 * 24);

  const { width: screenWidth } = Dimensions.get('window');
  const donutRadius = Math.max(56, Math.min((screenWidth - 80) / 3.2, 76));

  const getCurrentPercent = () => {
    if (daysQuit <= 0) return 0;
    for (let i = 0; i < PROGRESS_POINTS.length - 1; i++) {
      const p1 = PROGRESS_POINTS[i];
      const p2 = PROGRESS_POINTS[i + 1];
      if (daysQuit >= p1.x && daysQuit <= p2.x) {
        const ratio = (daysQuit - p1.x) / (p2.x - p1.x);
        return p1.y + ratio * (p2.y - p1.y);
      }
    }
    return 100;
  };

  const currentPercent = getCurrentPercent();
  const roundedPercent = Math.floor(currentPercent);

  const renderMilestone = ({ item, index }: { item: Milestone; index: number }) => {
    const progress = Math.min(1, timeElapsedMs / item.durationMs);
    const isCompleted = progress >= 1;
    const progressPercentage = Math.floor(progress * 100);

    const translatedMilestone = t('health.milestones') as unknown as { title: string; desc: string }[];
    const currentMilestone = translatedMilestone[index];

    let remainingText = '';
    if (!isCompleted) {
      const remainingMs = item.durationMs - timeElapsedMs;
      const remainingHours = remainingMs / (1000 * 60 * 60);
      if (remainingHours < 1) {
        remainingText = `${t('health.minLeft').replace('...', Math.ceil(remainingHours * 60).toString())} ${t('health.min')}`;
      } else if (remainingHours < 24) {
        remainingText = `${t('health.hourLeft').replace('...', Math.floor(remainingHours).toString())} ${t('health.hour')}`;
      } else {
        remainingText = `${t('health.dayLeft').replace('...', Math.floor(remainingHours / 24).toString())} ${t('health.day')}`;
      }
    }

    return (
      <View
        style={[
          styles.milestoneCard,
          {
            backgroundColor: themeColors.card,
            borderColor: isCompleted ? themeColors.tint + '40' : themeColors.border,
            borderWidth: isCompleted ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleInfo}>
            <Text style={[styles.milestoneTitle, { color: themeColors.text }]}>
              {currentMilestone.title}
            </Text>
            <Text style={[styles.milestoneDuration, { color: themeColors.tint }]}>
              {t('health.milestoneMarker')} {item.durationText}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCompleted ? themeColors.tint + '15' : themeColors.border,
              },
            ]}
          >
            {isCompleted ? (
              <IconSymbol size={16} name="heart.fill" color={themeColors.tint} />
            ) : (
              <Text style={[styles.progressText, { color: themeColors.muted }]}>
                {progressPercentage}%
              </Text>
            )}
          </View>
        </View>

        <Text style={[styles.milestoneDesc, { color: themeColors.muted }]}>
          {currentMilestone.desc}
        </Text>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: themeColors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: isCompleted ? themeColors.tint : '#0EA5E9',
                },
              ]}
            />
          </View>
          {!isCompleted && (
            <Text style={[styles.remainingText, { color: themeColors.muted }]}>
              {remainingText}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const wholeDays = Math.floor(daysQuit);

    return (
      <View style={styles.headerContainer}>

        {/* Recovery Donut Chart Card */}
        <View style={[styles.chartCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: themeColors.text }]}>{t('health.chartTitle')}</Text>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.donutContainer}>
              <AnimatedDonut
                percent={roundedPercent}
                size={donutRadius * 2}
                strokeWidth={Math.max(14, donutRadius * 0.22)}
                trackColor={themeColors.border}
                progressColor={themeColors.tint}
                replayKey={chartKey}
                centerLabel={
                  <>
                    <Text style={[styles.donutPercentText, { color: themeColors.text }]}>
                      {roundedPercent}%
                    </Text>
                    <Text style={[styles.donutPercentSub, { color: themeColors.muted }]}>
                      {t('health.recovery')}
                    </Text>
                  </>
                }
              />
            </View>

            <View style={styles.statsColumn}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>
                  {wholeDays}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.muted }]}>
                  {t('health.daysQuit')}
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: themeColors.border }]} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.tint }]}>
                  {roundedPercent}%
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.muted }]}>
                  {t('health.recovery')}
                </Text>
              </View>
            </View>
          </View>

          {/* 2 hàng: mức thời gian (trên) & % đạt được tương ứng (dưới).
              Mốc đã đạt được tô màu tint, mốc chưa đạt hiển thị mờ hơn. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.levelsScroll}
            contentContainerStyle={styles.levelsScrollContent}
          >
            <View>
              <View style={styles.levelsRow}>
                {DISPLAY_LEVELS.map((level) => {
                  const isReached = daysQuit >= level.x;
                  return (
                    <View key={`time-${level.label}`} style={styles.levelCell}>
                      <Text
                        style={[
                          styles.levelTimeText,
                          { color: isReached ? themeColors.tint : themeColors.muted },
                        ]}
                      >
                        {level.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.levelsRow}>
                {DISPLAY_LEVELS.map((level) => {
                  const isReached = daysQuit >= level.x;
                  return (
                    <View key={`percent-${level.label}`} style={styles.levelCell}>
                      <Text
                        style={[
                          styles.levelPercentText,
                          {
                            color: isReached ? themeColors.text : themeColors.muted,
                            opacity: isReached ? 1 : 0.5,
                          },
                        ]}
                      >
                        {level.y}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        <Text style={[styles.listSectionTitle, { color: themeColors.text }]}>{t('health.milestonesTitle')}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('health.title')}</Text>
        <Text style={[styles.headerSub, { color: themeColors.muted }]}>
          {t('health.subtitle')}
        </Text>
      </View>

      <FlatList
        ListHeaderComponent={renderHeader()}
        data={HEALTH_MILESTONES}
        keyExtractor={(item) => item.id}
        renderItem={renderMilestone}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  headerContainer: {
    marginBottom: 10,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 20,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 16,
  },
  chartCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPercentText: {
    fontSize: 20,
    fontWeight: '800',
  },
  donutPercentSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statsColumn: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
    gap: 12,
  },
  statItem: {
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    height: 1,
    width: '100%',
  },
  levelsScroll: {
    marginTop: 16,
  },
  levelsScrollContent: {
    paddingTop: 4,
  },
  levelsRow: {
    flexDirection: 'row',
  },
  levelCell: {
    minWidth: 42,
    alignItems: 'center',
    marginRight: 12,
  },
  levelTimeText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  levelPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  milestoneCard: {
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleInfo: {
    flex: 1,
    paddingRight: 10,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  milestoneDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  milestoneDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
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
});