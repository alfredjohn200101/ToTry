// THE COMPANION — the heart of To Try. Rises like iMessage (a bottom-sheet, not a takeover).
// Two states: the Feeling Door grid -> a live conversation with the brother (the ai-proxy).
// Built as a custom Reanimated sheet so it works identically on web and native.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design/Text';
import { colors, space, radius, fonts, motion } from '@/design/tokens';
import { api, ChatMsg } from '@/ai/api';
import { FEELINGS, Feeling } from '@/soul/feelings';
import { buildCompanionSystem, COMPANION_FALLBACK, Struggle } from '@/soul/companionPrompt';
import { registerCompanionOpener } from './companionController';

type Mode = 'feelings' | 'talking';

export function CompanionSheet() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetH = Math.min(height * 0.92, height - insets.top - 8);

  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('feelings');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [showBridge, setShowBridge] = useState(false);
  const struggleRef = useRef<Struggle | null>(null);
  const histRef = useRef<ChatMsg[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const progress = useSharedValue(0);

  const say = useCallback(async (userText: string | null, opening: boolean) => {
    const struggle = struggleRef.current;
    if (!struggle) return;
    if (userText) {
      const m: ChatMsg = { role: 'user', content: userText };
      histRef.current = [...histRef.current, m];
      setMessages((prev) => [...prev, m]);
    }
    setBusy(true);
    const sys = buildCompanionSystem(struggle, opening, {});
    let reply = '';
    try {
      reply = await api(sys, histRef.current, opening ? 'Open the moment with me.' : userText || '...', 500, { timeout: 30000 });
    } catch {
      reply = '';
    }
    if (!reply || reply.length < 2) reply = COMPANION_FALLBACK;
    const am: ChatMsg = { role: 'assistant', content: reply };
    histRef.current = [...histRef.current, am];
    setMessages((prev) => [...prev, am]);
    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 80);
  }, []);

  const enterTalking = useCallback(
    (f: Feeling) => {
      struggleRef.current = f.struggle;
      histRef.current = [];
      setMessages([]);
      setShowBridge(false);
      setMode('talking');
      say(null, true);
    },
    [say],
  );

  const open = useCallback(
    (feeling?: Feeling) => {
      if (feeling) enterTalking(feeling);
      else {
        setMode('feelings');
        setShowBridge(false);
      }
      setVisible(true);
      progress.value = withSpring(1, motion.spring);
    },
    [enterTalking, progress],
  );

  const close = useCallback(() => {
    progress.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) runOnJS(setVisible)(false);
    });
  }, [progress]);

  useEffect(() => {
    registerCompanionOpener(open);
    if (typeof globalThis !== 'undefined') (globalThis as any).__openCompanion = open;
    return () => registerCompanionOpener(null);
  }, [open]);

  const send = useCallback(() => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    say(t, false);
  }, [text, busy, say]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.65 }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * sheetH }] }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { height: sheetH }, sheetStyle]}>
        <View style={styles.handle} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {mode === 'feelings' ? (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <Text variant="display" style={{ textAlign: 'center', marginTop: space.s2 }}>
                What are you feeling?
              </Text>
              <Text variant="callout" style={{ textAlign: 'center', marginTop: space.s3, marginBottom: space.s5 }}>
                No wrong answer. Just name it — I'll take it from there.
              </Text>
              <View style={styles.grid}>
                {FEELINGS.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => enterTalking(f)}
                    style={({ pressed }) => [styles.cell, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                  >
                    <Text style={{ fontSize: 28 }}>{f.emoji}</Text>
                    <Text style={{ marginTop: space.s2, fontWeight: '600', color: colors.tx, fontSize: 16 }}>{f.label}</Text>
                    <Text variant="subhead" style={{ marginTop: 1 }}>
                      {f.sub}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={close} style={{ marginTop: space.s5, alignSelf: 'center', padding: space.s3 }}>
                <Text variant="callout">Not now</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color={colors.go} style={{ paddingHorizontal: space.s5, paddingTop: space.s1 }}>
                I'm with you
              </Text>
              <ScrollView ref={scrollRef} contentContainerStyle={styles.conv} showsVerticalScrollIndicator={false}>
                {messages.map((m, i) => (
                  <View key={i} style={[styles.bubble, m.role === 'user' ? styles.me : styles.them]}>
                    <Text style={{ color: m.role === 'user' ? '#231803' : colors.tx, fontSize: 16, lineHeight: 23 }}>
                      {m.content}
                    </Text>
                  </View>
                ))}
                {busy && (
                  <View style={[styles.bubble, styles.them, { flexDirection: 'row', gap: 8 }]}>
                    <ActivityIndicator size="small" color={colors.tx3} />
                  </View>
                )}
                {showBridge && (
                  <View style={styles.bridgeCard}>
                    <Text style={{ color: colors.re, fontWeight: '700', fontSize: 16 }}>Reaching a real person is strength.</Text>
                    <Text variant="body" style={{ marginTop: space.s2 }}>
                      Lifeline: 13 11 14
                    </Text>
                    <Text variant="body">Beyond Blue: 1300 22 4636</Text>
                    <Text variant="subhead" style={{ marginTop: space.s2 }}>
                      To Try walks beside you — it's never the whole answer. A friend, a priest, a counsellor can hold
                      what an app can't.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputRow}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="talk to me…"
                  placeholderTextColor={colors.tx3}
                  style={styles.input}
                  onSubmitEditing={send}
                  returnKeyType="send"
                />
                <Pressable onPress={send} style={styles.send} disabled={busy}>
                  <Text style={{ color: '#231803', fontWeight: '700', fontSize: 18 }}>↑</Text>
                </Pressable>
              </View>
              <View style={[styles.footerRow, { paddingBottom: insets.bottom + space.s3 }]}>
                <Pressable onPress={close}>
                  <Text variant="subhead" color={colors.gr}>
                    I'm through it 🌱
                  </Text>
                </Pressable>
                <Pressable onPress={() => setShowBridge((v) => !v)}>
                  <Text variant="subhead">this feels bigger — reach a real person</Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: '#000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderCurve: 'continuous',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bd2,
    paddingTop: space.s3,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.tx3, alignSelf: 'center', marginBottom: space.s2 },
  body: { paddingHorizontal: space.s5, paddingBottom: space.s8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s3 },
  cell: {
    width: '47.8%',
    backgroundColor: colors.bg3,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: space.s4,
    minHeight: 108,
  },
  conv: { paddingHorizontal: space.s5, paddingTop: space.s3, paddingBottom: space.s4, gap: space.s3 },
  bubble: { maxWidth: '86%', borderRadius: radius.card, borderCurve: 'continuous', paddingVertical: space.s3, paddingHorizontal: space.s4 },
  them: { alignSelf: 'flex-start', backgroundColor: colors.bg3, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  me: { alignSelf: 'flex-end', backgroundColor: colors.go },
  bridgeCard: {
    backgroundColor: colors.reBg,
    borderColor: colors.reBd,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: space.s4,
    marginTop: space.s2,
  },
  inputRow: { flexDirection: 'row', gap: space.s2, paddingHorizontal: space.s5, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bg3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bd2,
    paddingHorizontal: space.s4,
    paddingVertical: space.s3,
    color: colors.tx,
    fontFamily: fonts.system,
    fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.go, alignItems: 'center', justifyContent: 'center' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    gap: space.s3,
  },
});
