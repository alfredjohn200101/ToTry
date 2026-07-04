import { useRef, useState } from 'react';
import { View, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '@/design/Aurora';
import { Text } from '@/design/Text';
import { Flourish } from '@/design/Flourish';
import { colors, space, fonts, radius, getDaypart } from '@/design/tokens';
import { api, type ChatMsg } from '@/ai/api';
import { getLifeState } from '@/state/lifeState';
import { buildCoachSystem, COACH_FALLBACK, COACH_PROMPTS } from '@/soul/coachPrompt';

export default function Coach() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: t }];
    setMessages(next);
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    let reply = '';
    try {
      reply = await api(buildCoachSystem(getLifeState().brief), messages, t, 700, { timeout: 30000 });
    } catch {
      reply = '';
    }
    setMessages([...next, { role: 'assistant', content: reply && reply.length > 1 ? reply : COACH_FALLBACK }]);
    setBusy(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <View style={styles.root}>
      <Aurora daypart={getDaypart()} />
      <View style={{ flex: 1, paddingTop: insets.top + space.s3 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: space.s2 }}>
            <Text variant="callout" color={colors.tx3}>‹ Back</Text>
          </Pressable>
          <Text variant="title" style={{ marginTop: space.s2 }}>Your coach</Text>
          <Flourish />
          <Text variant="callout" style={{ marginTop: space.s3 }}>
            I see the whole of you — the body, the fight, the money, the spirit. Ask me anything, or
            just "what should I do right now?"
          </Text>
        </View>

        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.s5, paddingBottom: space.s5 }} showsVerticalScrollIndicator={false}>
          {messages.length === 0 && !busy && (
            <View style={{ marginTop: space.s5, gap: space.s3 }}>
              {COACH_PROMPTS.map((p) => (
                <Pressable key={p} onPress={() => send(p)} style={styles.prompt}>
                  <Text variant="body" color={colors.tx2}>{p}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubbleRow, m.role === 'user' ? styles.right : styles.left]}>
              {m.role === 'assistant' && <View style={styles.coachDot} />}
              <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.coachBubble]}>
                <Text variant="body" style={{ color: m.role === 'user' ? colors.tx : colors.tx, lineHeight: 24 }}>{m.content}</Text>
              </View>
            </View>
          ))}
          {busy && (
            <View style={[styles.bubbleRow, styles.left]}>
              <View style={styles.coachDot} />
              <View style={[styles.bubble, styles.coachBubble]}><ActivityIndicator color={colors.go} /></View>
            </View>
          )}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom}>
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + space.s3 }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask your coach…"
              placeholderTextColor={colors.tx3}
              style={styles.input}
              multiline
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              blurOnSubmit
            />
            <Pressable onPress={() => send(input)} style={[styles.send, (!input.trim() || busy) && { opacity: 0.4 }]} disabled={!input.trim() || busy}>
              <Text style={{ fontFamily: fonts.sansSemi, fontSize: 15, color: '#231803' }}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.s5, paddingBottom: space.s3 },
  prompt: { paddingHorizontal: space.s4, paddingVertical: space.s4, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, backgroundColor: colors.bg2 },
  bubbleRow: { flexDirection: 'row', marginTop: space.s4, alignItems: 'flex-end', gap: space.s2 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '82%', paddingHorizontal: space.s4, paddingVertical: space.s3, borderRadius: 18, borderCurve: 'continuous' },
  userBubble: { backgroundColor: colors.bg4, borderTopRightRadius: 6 },
  coachBubble: { backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd, borderTopLeftRadius: 6 },
  coachDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.go, marginBottom: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s2, paddingHorizontal: space.s5, paddingTop: space.s3, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bd, backgroundColor: colors.glass },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.bg2, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bd2, borderRadius: 20, borderCurve: 'continuous', paddingHorizontal: space.s4, paddingVertical: space.s3, color: colors.tx, fontFamily: fonts.sans, fontSize: 16 },
  send: { paddingHorizontal: space.s5, height: 44, borderRadius: 20, backgroundColor: colors.go, alignItems: 'center', justifyContent: 'center' },
});
