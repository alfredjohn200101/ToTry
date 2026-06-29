// The breathing orb — the Feeling Door, reachable from anywhere with one thumb.
// Gold (the app) → purple (the soul). Gently breathes. The animated body is
// pointerEvents:none so the press always resolves to the Pressable hit target.
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, elevation } from '@/design/tokens';
import { openCompanion } from './companionController';

export function Orb({ bottom = 96 }: { bottom?: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.06, { duration: 2200 }), withTiming(1, { duration: 2200 })), -1, true);
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPress = () => {
    if (process.env.EXPO_OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    openCompanion();
  };

  return (
    <Pressable onPress={onPress} style={[styles.wrap, { bottom }]} accessibilityLabel="How are you feeling? Open the Feeling Door">
      <Animated.View style={[styles.orb, elevation.gold, animStyle, { pointerEvents: 'none' }]}>
        <LinearGradient colors={[colors.go, colors.pu]} start={{ x: 0.1, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={[StyleSheet.absoluteFill, styles.round]} />
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#1A1205" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5z" />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 90, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  orb: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  round: { borderRadius: 28 },
});
