import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../lib/theme';
import { useTaskStore } from '../../store/useTaskStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useFitnessStore } from '../../store/useFitnessStore';
import { fetchHealthData } from '../../lib/health';
import { generateMorningBrief, getApiKey } from '../../lib/claude';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function formatDate() {
  return new Date().toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function HomeScreen() {
  const tasks = useTaskStore(s => s.tasks);
  const loadTasks = useTaskStore(s => s.load);
  const habits = useHabitStore(s => s.habits);
  const isCompleted = useHabitStore(s => s.isCompleted);
  const getStreak = useHabitStore(s => s.getStreak);
  const loadHabits = useHabitStore(s => s.load);
  const fitness = useFitnessStore(s => s.summary);

  const [brief, setBrief] = useState<string>('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const openTasks = tasks.filter(t => !t.completed);
  const completedHabitsToday = habits.filter(h => isCompleted(h.id, today)).length;

  const loadData = useCallback(async () => {
    await Promise.all([loadTasks(), loadHabits(), fetchHealthData()]);
  }, []);

  const fetchBrief = useCallback(async () => {
    const key = await getApiKey();
    if (!key) return;
    setBriefLoading(true);
    try {
      const ctx = {
        habits: habits.map(h => ({ name: h.name, streak: getStreak(h.id), completedToday: isCompleted(h.id, today) })),
        tasks: openTasks.map(t => ({ title: t.title, dueDate: t.dueDate, priority: t.priority })),
        fitness: fitness ? { todaySteps: fitness.todaySteps, todayCalories: fitness.todayCalories, avgSleep: fitness.avgSleep, avgHeartRate: fitness.avgHeartRate } : undefined,
      };
      const result = await generateMorningBrief(ctx);
      setBrief(result);
    } catch {
      // silent
    } finally {
      setBriefLoading(false);
    }
  }, [habits, openTasks, fitness]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (habits.length > 0 || tasks.length > 0) {
      fetchBrief();
    }
  }, [habits.length, tasks.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await fetchBrief();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting()} 👋</Text>
          <Text style={s.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={s.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        <StatCard label="Aufgaben" value={openTasks.length.toString()} sub="offen" icon="checkmark-circle-outline" color={colors.accent} />
        <StatCard label="Gewohnheiten" value={`${completedHabitsToday}/${habits.length}`} sub="heute" icon="calendar-outline" color={colors.green} />
        {fitness && (
          <StatCard label="Schritte" value={fitness.todaySteps.toLocaleString()} sub="heute" icon="walk-outline" color={colors.yellow} />
        )}
      </View>

      {/* Morning Brief */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={s.cardTitle}>Dein Tages-Brief</Text>
        </View>
        {briefLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
        ) : brief ? (
          <Text style={s.briefText}>{brief}</Text>
        ) : (
          <Text style={s.briefEmpty}>
            {habits.length === 0 && tasks.length === 0
              ? 'Füge Gewohnheiten und Aufgaben hinzu, um deinen persönlichen Brief zu sehen.'
              : 'API-Key in Einstellungen hinterlegen, um deinen persönlichen Morning Brief zu aktivieren.'}
          </Text>
        )}
      </View>

      {/* Quick Tasks */}
      {openTasks.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
            <Text style={s.cardTitle}>Nächste Aufgaben</Text>
          </View>
          {openTasks.slice(0, 3).map(task => (
            <View key={task.id} style={s.taskRow}>
              <View style={s.taskDot} />
              <Text style={s.taskText} numberOfLines={1}>{task.title}</Text>
            </View>
          ))}
          {openTasks.length > 3 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={s.seeAll}>+{openTasks.length - 3} weitere →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Habits Today */}
      {habits.length > 0 && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="flame-outline" size={16} color={colors.accent} />
            <Text style={s.cardTitle}>Gewohnheiten heute</Text>
          </View>
          {habits.slice(0, 4).map(habit => {
            const done = isCompleted(habit.id, today);
            return (
              <View key={habit.id} style={s.habitRow}>
                <Text style={s.habitIcon}>{habit.icon}</Text>
                <Text style={[s.habitName, done && s.habitDone]}>{habit.name}</Text>
                {done && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
              </View>
            );
          })}
        </View>
      )}

      {/* Fitness Snapshot */}
      {fitness && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="fitness-outline" size={16} color={colors.accent} />
            <Text style={s.cardTitle}>Fitness heute</Text>
          </View>
          <View style={s.fitnessGrid}>
            <FitnessItem label="Schritte" value={fitness.todaySteps.toLocaleString()} icon="👣" />
            <FitnessItem label="Kalorien" value={`${fitness.todayCalories} kcal`} icon="🔥" />
            {fitness.avgSleep && <FitnessItem label="Schlaf" value={`${fitness.avgSleep}h`} icon="😴" />}
            {fitness.avgHeartRate && <FitnessItem label="Herzrate" value={`${fitness.avgHeartRate} bpm`} icon="❤️" />}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: any; color: string }) {
  return (
    <View style={[s.statCard, { borderColor: color + '40' }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

function FitnessItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={s.fitnessItem}>
      <Text style={s.fitnessIcon}>{icon}</Text>
      <Text style={s.fitnessValue}>{value}</Text>
      <Text style={s.fitnessLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, paddingTop: spacing.lg },
  greeting: { fontSize: 26, fontWeight: '700', color: colors.text },
  date: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  settingsBtn: { padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textDim, fontWeight: '500' },
  statSub: { fontSize: 9, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  briefText: { fontSize: 14, color: colors.textDim, lineHeight: 22 },
  briefEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  taskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  taskText: { flex: 1, fontSize: 14, color: colors.textDim },
  seeAll: { fontSize: 13, color: colors.accent, marginTop: 6 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  habitIcon: { fontSize: 18 },
  habitName: { flex: 1, fontSize: 14, color: colors.textDim },
  habitDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  fitnessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fitnessItem: { flex: 1, minWidth: '45%', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  fitnessIcon: { fontSize: 22 },
  fitnessValue: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },
  fitnessLabel: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
