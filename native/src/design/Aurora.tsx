// The daypart aurora — a soft radial glow over a warm vertical base. The app breathes
// with the time of day. True radial gradients (react-native-svg) for a candlelit depth.
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { aurora, Daypart, getDaypart } from './tokens';

export function Aurora({ daypart = getDaypart(), style }: { daypart?: Daypart; style?: ViewStyle }) {
  const a = aurora[daypart];
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, style]}>
      <LinearGradient colors={a.base} style={StyleSheet.absoluteFill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {/* warm glow from the upper area */}
          <RadialGradient id="glowTop" cx="78%" cy="2%" rx="85%" ry="55%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={a.glow} stopOpacity={1} />
            <Stop offset="1" stopColor={a.glow} stopOpacity={0} />
          </RadialGradient>
          {/* cool secondary from the lower-left */}
          <RadialGradient id="glowBottom" cx="8%" cy="100%" rx="70%" ry="55%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={a.glow2} stopOpacity={1} />
            <Stop offset="1" stopColor={a.glow2} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowTop)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowBottom)" />
      </Svg>
    </View>
  );
}
