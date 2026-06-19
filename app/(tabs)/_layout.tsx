import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/theme-context';

const { width: screenWidth } = Dimensions.get('window');

// Individual tab button with spring scaling micro-animation
interface TabButtonProps {
  iconName: string;
  isActive: boolean;
  color: string;
  activeColor: string;
  onPress: () => void;
  onLongPress: () => void;
}

const TabButton = ({
  iconName,
  isActive,
  color,
  activeColor,
  onPress,
  onLongPress,
}: TabButtonProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.04 : 1,
        useNativeDriver: true,
        friction: 7,
        tension: 70,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.78,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <IconSymbol
          size={24}
          name={iconName as any}
          color={isActive ? activeColor : color}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// Custom Animated Floating Tab Bar
const AnimatedTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { activeScheme } = useTheme();
  const themeColors = Colors[activeScheme];
  const tabShadowColor = activeScheme === 'dark' ? '#000000' : '#94A3B8';

  // Dimensions of floating bar
  const horizontalMargin = 16;
  const barPadding = 8;
  const containerWidth = screenWidth - horizontalMargin * 2;
  const contentWidth = containerWidth - barPadding * 2;
  const tabWidth = contentWidth / state.routes.length;

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: themeColors.background,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            width: containerWidth,
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
            shadowColor: tabShadowColor,
            shadowOpacity: activeScheme === 'dark' ? 0.32 : 0.1,
            shadowRadius: 14,
          },
        ]}
      >
        {/* Animated Circular Highlight */}
        <Animated.View
          style={[
            styles.slidingCircle,
            {
              width: 46,
              height: 46,
              left: barPadding + (tabWidth - 46) / 2,
              borderColor: themeColors.tint,
              backgroundColor: themeColors.tint + '12',
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />

        {/* Tab Items */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Resolve icon name
          let iconName = 'house.fill';
          if (route.name === 'health') iconName = 'heart.fill';
          else if (route.name === 'cravings') iconName = 'leaf.fill';
          else if (route.name === 'profile') iconName = 'person.fill';

          return (
            <TabButton
              key={route.key}
              iconName={iconName}
              isActive={isFocused}
              color={themeColors.tabIconDefault}
              activeColor={themeColors.tint}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Sức khỏe',
        }}
      />
      <Tabs.Screen
        name="cravings"
        options={{
          title: 'Cơn thèm',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    width: '100%',
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    height: 72,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  slidingCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
