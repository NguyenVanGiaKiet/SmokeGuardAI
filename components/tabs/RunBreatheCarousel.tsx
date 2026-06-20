import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';

interface Props {
  children: React.ReactNode;
}

export const RunBreatheCarousel = ({ children }: Props) => {
  // IMPORTANT: do not use Dimensions.get('window').width for the page
  // width. This carousel is rendered inside a parent container that has
  // its own horizontal padding (e.g. `scrollContent: { padding: 20 }` in
  // the screen that uses it), so the carousel's actual on-screen width is
  // narrower than the full device width. If pages are sized to the full
  // device width, they overflow the visible container and get clipped on
  // the side whenever the ScrollView is at rest (not mid-drag) — which is
  // exactly the "bị che khuất" symptom. Instead we measure the carousel's
  // own rendered width via onLayout and size everything off of that.
  const [containerWidth, setContainerWidth] = useState(0);

  // Track the measured height of each page, then use the tallest one
  // as the height of the whole horizontal ScrollView. This is required
  // because this carousel is itself nested inside a parent ScrollView,
  // which gives unbounded height to its children — without an explicit
  // height, `flex: 1` collapses and pages get clipped when not actively
  // scrolling.
  const [pageHeights, setPageHeights] = useState<number[]>([]);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth((prev) => (prev === w ? prev : w));
  }, []);

  const handlePageLayout = useCallback((index: number, e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setPageHeights((prev) => {
      if (prev[index] === h) return prev;
      const next = [...prev];
      next[index] = h;
      return next;
    });
  }, []);

  const containerHeight = pageHeights.length > 0 ? Math.max(...pageHeights) : undefined;

  return (
    <View onLayout={handleContainerLayout}>
      {containerWidth > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={containerHeight ? { height: containerHeight } : null}
          contentContainerStyle={{ gap: 0 }}
          snapToInterval={containerWidth}
          decelerationRate="fast"
        >
          {React.Children.map(children, (child, index) => (
            <View key={index} style={{ width: containerWidth }}>
              {/* Internal padding to simulate gap without breaking paging */}
              <View
                style={styles.innerChild}
                onLayout={(e) => handlePageLayout(index, e)}
              >
                {child}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  innerChild: {
    paddingHorizontal: 20, // This replaces the gap to show spacing without breaking paging
  },
});