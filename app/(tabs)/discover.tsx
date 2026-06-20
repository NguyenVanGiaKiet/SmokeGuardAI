import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Dimensions,
  Platform,
  Image,
  LayoutAnimation,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const HARM_IMAGES = [
  require('@/assets/images/index/1042361_A30-a-11.jpg'),
  require('@/assets/images/index/1042362_A30-a-12.jpg'),
  require('@/assets/images/index/1042363_A30-a-13.jpg'),
  require('@/assets/images/index/1042364_A30-a-14.jpg'),
  require('@/assets/images/index/1042365_A30-a-15.jpg'),
  require('@/assets/images/index/1042366_A30-a-16.jpg'),
];

export default function DiscoverScreen() {
  const { activeScheme } = useTheme();
  const { t } = useLanguage();
  const themeColors = Colors[activeScheme];

  const [harmSlideIndex, setHarmSlideIndex] = useState(0);
  const [harmAutoPlay, setHarmAutoPlay] = useState(true);
  const harmScrollRef = useRef<ScrollView>(null);
  const harmResumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const harmSlideWidth = width - 40; 

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        harmScrollRef.current?.scrollTo({ x: harmSlideIndex * harmSlideWidth, animated: false });
      }, 50);

      if (!harmAutoPlay || HARM_IMAGES.length <= 1) {
        return () => clearTimeout(timer);
      }

      const harmInterval = setInterval(() => {
        setHarmSlideIndex((prev) => {
          const next = (prev + 1) % HARM_IMAGES.length;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          harmScrollRef.current?.scrollTo({ x: next * harmSlideWidth, animated: true });
          return next;
        });
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearInterval(harmInterval);
      };
    }, [harmAutoPlay, harmSlideWidth, harmSlideIndex])
  );

  const updateHarmIndexFromOffset = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / harmSlideWidth);
    setHarmSlideIndex((prev) => {
      if (index === prev) return prev;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      return index;
    });
  };

  const handleHarmSlideTouchStart = () => {
    if (harmResumeTimeout.current) {
      clearTimeout(harmResumeTimeout.current);
      harmResumeTimeout.current = null;
    }
    if (harmAutoPlay) setHarmAutoPlay(false);
  };

  const handleHarmSlideTouchEnd = () => {
    if (harmResumeTimeout.current) clearTimeout(harmResumeTimeout.current);
    harmResumeTimeout.current = setTimeout(() => {
      setHarmAutoPlay(true);
      harmResumeTimeout.current = null;
    }, 3000);
  };

  const handleHarmSlideSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateHarmIndexFromOffset(e);
    handleHarmSlideTouchEnd();
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: themeColors.background }]}>
      <StatusBar style={activeScheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('discover.title')}</Text>
        
        <View style={styles.harmSliderWrapper}>
          <ScrollView
            ref={harmScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onTouchStart={handleHarmSlideTouchStart}
            onTouchEnd={handleHarmSlideTouchEnd}
            onScrollBeginDrag={handleHarmSlideTouchStart}
            onScrollEndDrag={handleHarmSlideSettled}
            onMomentumScrollEnd={handleHarmSlideSettled}
          >
            {HARM_IMAGES.map((img, idx) => (
              <View key={idx} style={[styles.harmSlide, { width: harmSlideWidth }]}>
                <Image
                  source={img}
                  style={[
                    styles.harmImage,
                    { width: harmSlideWidth, borderColor: themeColors.border },
                  ]}
                  resizeMode="cover"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.harmDotsRow}>
            {HARM_IMAGES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.harmDot,
                  {
                    backgroundColor: idx === harmSlideIndex ? themeColors.tint : themeColors.border,
                    width: idx === harmSlideIndex ? 18 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.infoTitle, { color: themeColors.text }]}>{t('discover.whyQuitTitle')}</Text>
          <Text style={[styles.infoText, { color: themeColors.muted }]}>
            {t('discover.whyQuitBody1')}
          </Text>
          <Text style={[styles.infoText, { color: themeColors.muted, marginTop: 10 }]}>
            {t('discover.whyQuitBody2')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
  },
  harmSliderWrapper: {
    marginBottom: 20,
  },
  harmSlide: {
    alignItems: 'center',
  },
  harmImage: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
  },
  harmDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  harmDot: {
    height: 6,
    borderRadius: 3,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
