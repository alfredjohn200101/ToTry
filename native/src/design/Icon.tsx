// Line icons — clean iOS/SF-style outline glyphs, drawn at 24x24, inherit stroke colour.
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import { colors } from './tokens';

export type IconName =
  | 'today'
  | 'soul'
  | 'grow'
  | 'money'
  | 'settings'
  | 'sunrise'
  | 'moon'
  | 'clock'
  | 'book'
  | 'cross'
  | 'flame'
  | 'dumbbell'
  | 'leaf'
  | 'pulse'
  | 'person'
  | 'bell'
  | 'chevron';

export function Icon({
  name,
  size = 24,
  color = colors.tx2,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'today':
      return (
        <Svg {...p}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Polyline points="9,22 9,12 15,12 15,22" />
        </Svg>
      );
    case 'soul':
      return (
        <Svg {...p}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </Svg>
      );
    case 'grow':
      return (
        <Svg {...p}>
          <Path d="M12 22c0-6 0-10 4-13M12 22c0-6 0-10-4-13" />
          <Circle cx="12" cy="5" r="2.5" />
        </Svg>
      );
    case 'money':
      return (
        <Svg {...p}>
          <Line x1="12" y1="1" x2="12" y2="23" />
          <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...p}>
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
      );
    case 'sunrise':
      return (
        <Svg {...p}>
          <Path d="M17 18a5 5 0 0 0-10 0" />
          <Line x1="12" y1="2" x2="12" y2="9" />
          <Line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
          <Line x1="1" y1="18" x2="3" y2="18" />
          <Line x1="21" y1="18" x2="23" y2="18" />
          <Line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
          <Line x1="23" y1="22" x2="1" y2="22" />
          <Polyline points="8,6 12,2 16,6" />
        </Svg>
      );
    case 'moon':
      return (
        <Svg {...p}>
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...p}>
          <Circle cx="12" cy="12" r="9" />
          <Polyline points="12,7 12,12 16,14" />
        </Svg>
      );
    case 'book':
      return (
        <Svg {...p}>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </Svg>
      );
    case 'cross':
      return (
        <Svg {...p}>
          <Line x1="12" y1="3" x2="12" y2="21" />
          <Line x1="8" y1="8" x2="16" y2="8" />
        </Svg>
      );
    case 'flame':
      return (
        <Svg {...p}>
          <Path d="M12 2C9.5 5.5 8 7.5 8 11a4 4 0 0 0 8 0c0-1.8-.9-3-2-4.5-1 1.8-2 1.8-2 0z" />
          <Path d="M16 11a4 4 0 0 1-8 0" />
        </Svg>
      );
    case 'dumbbell':
      return (
        <Svg {...p}>
          <Line x1="4" y1="9" x2="4" y2="15" />
          <Line x1="7" y1="6" x2="7" y2="18" />
          <Line x1="17" y1="6" x2="17" y2="18" />
          <Line x1="20" y1="9" x2="20" y2="15" />
          <Line x1="7" y1="12" x2="17" y2="12" />
        </Svg>
      );
    case 'leaf':
      return (
        <Svg {...p}>
          <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z" />
          <Path d="M2 21c0-3 1.85-5.4 5.08-6" />
        </Svg>
      );
    case 'pulse':
      return (
        <Svg {...p}>
          <Polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </Svg>
      );
    case 'person':
      return (
        <Svg {...p}>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...p}>
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...p}>
          <Path d="M9 6l6 6-6 6" />
        </Svg>
      );
  }
}
