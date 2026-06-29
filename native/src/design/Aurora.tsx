// The daypart aurora — the whole app breathes with the time of day.
// Approximates the PWA's radial auroras with layered linear gradients until SVG radials land.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { aurora, Daypart, getDaypart } from './tokens';

export function Aurora({
  daypart = getDaypart(),
  style,
  intensity = 1,
}: {
  daypart?: Daypart;
  style?: ViewStyle;
  intensity?: number;
}) {
  const a = aurora[daypart];
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>
      {/* base vertical wash */}
      <LinearGradient colors={a.base} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
      {/* warm/cool glow from the top-right, fading out */}
      <LinearGradient
        colors={[a.glowTop, 'transparent']}
        style={[StyleSheet.absoluteFill, { opacity: intensity }]}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.3, y: 0.6 }}
      />
      {/* second glow from the bottom-left */}
      <LinearGradient
        colors={['transparent', a.glowBottom]}
        style={[StyleSheet.absoluteFill, { opacity: intensity }]}
        start={{ x: 0.2, y: 0.5 }}
        end={{ x: 0, y: 1 }}
      />
    </View>
  );
}
