import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../lib/theme';
import { sendMessage, Message, getApiKey } from '../../lib/claude';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useFitnessStore } from '../../store/useFitnessStore';
import { router } from 'expo-router';

const QUICK_PROMPTS = [
  'Was sind meine Prioritäten heute?',
  'Wie ist mein Fitness-Fortschritt?',
  'Motiviere mich!',
  'Zeig mir meinen Wochenrückblick',
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const listRef = useRef<FlatList>(null);

  const tasks = useTaskStore(s => s.tasks);
  const habits = useHabitStore(s => s.habits);
  const isCompleted = useHabitStore(s => s.isCompleted);
  const getStreak = useHabitStore(s => s.getStreak);
  const fitness = useFitnessStore(s => s.summary);

  const today = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    getApiKey().then(k => setHasKey(!!k));
  }, []);

  const buildContext = useCallback(() => ({
    habits: habits.map(h => ({ name: h.name, streak: getStreak(h.id), completedToday: isCompleted(h.id, today) })),
    tasks: tasks.filter(t => !t.completed).map(t => ({ title: t.title, dueDate: t.dueDate, priority: t.priority })),
    fitness: fitness ? { todaySteps: fitness.todaySteps, todayCalories: fitness.todayCalories, avgSleep: fitness.avgSleep, avgHeartRate: fitness.avgHeartRate } : undefined,
  }), [habits, tasks, fitness]);

  const send = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await sendMessage(updated, buildContext());
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages([...updated, { role: 'assistant', content: `Fehler: ${e.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (hasKey === false) {
    return (
      <View style={s.center}>
        <Ionicons name="key-outline" size={48} color={colors.textMuted} />
        <Text style={s.centerTitle}>Anthropic API-Key benötigt</Text>
        <Text style={s.centerSub}>Hinterlege deinen API-Key in den Einstellungen, um Claude zu nutzen.</Text>
        <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/settings')}>
          <Text style={s.settingsBtnText}>Zu den Einstellungen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Text style={s.title}>Claude</Text>
        <TouchableOpacity onPress={() => setMessages([])} style={s.clearBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={[s.messageList, messages.length === 0 && s.emptyList]}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.avatarCircle}>
              <Ionicons name="sparkles" size={32} color={colors.accent} />
            </View>
            <Text style={s.emptyTitle}>Hallo! Ich bin dein persönlicher Assistent.</Text>
            <Text style={s.emptySub}>Ich kenne deine Gewohnheiten, Aufgaben und Fitness-Daten. Frag mich alles!</Text>
            <View style={s.quickPrompts}>
              {QUICK_PROMPTS.map(p => (
                <TouchableOpacity key={p} style={s.quickBtn} onPress={() => send(p)}>
                  <Text style={s.quickText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListFooterComponent={
          loading ? (
            <View style={s.typingIndicator}>
              <View style={[s.bubble, s.assistantBubble]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          ) : null
        }
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Schreib eine Nachricht..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
          onPress={() => input.trim() && send(input.trim())}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="arrow-up" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[s.messageRow, isUser ? s.userRow : s.assistantRow]}>
      {!isUser && (
        <View style={s.assistantAvatar}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.userBubble : s.assistantBubble]}>
        <Text style={[s.bubbleText, isUser ? s.userText : s.assistantText]}>{message.content}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingTop: spacing.lg + spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  clearBtn: { padding: spacing.sm },
  messageList: { padding: spacing.md, gap: spacing.sm },
  emptyList: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 22 },
  quickPrompts: { width: '100%', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  quickText: { fontSize: 14, color: colors.textDim, textAlign: 'center' },
  messageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  assistantAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.md },
  userBubble: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: colors.text },
  assistantText: { color: colors.textDim },
  typingIndicator: { flexDirection: 'row', padding: spacing.sm },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.accentDim },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: 16 },
  centerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  centerSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  settingsBtn: { marginTop: spacing.sm, backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md },
  settingsBtnText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
