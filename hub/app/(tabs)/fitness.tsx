import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing, radius } from '../../lib/theme';
import { useFitnessStore } from '../../store/useFitnessStore';
import { fetchHealthData } from '../../lib/health';
import { generateFitnessCoaching, getApiKey } from '../../lib/claude';

const W = Dimensions.get('window').width - spacing.md * 2;

const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  color: (opacity = 1) => `rgba(124, 106, 247, ${opacity})`,
  labelColor: () => colors.textMuted,
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.accent },
  propsForBackgroundLines: { stroke: colors.border },
  decimalPlaces: 0,
};

export default function FitnessScreen() {
  const { summary, loading, error } = useFitnessStore();
  const [coaching, setCoaching] = useState('');
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [chartType, setChartType] = useState<'steps' | 'calories'>('steps');

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (summary) {
      loadCoaching();
    }
  }, [summary?.todaySteps]);

  const loadCoaching = async () => {
    const key = await getApiKey();
    if (!key || !summary) return;
    setCoachingLoading(true);
    try {
      const text = await generateFitnessCoaching({
        todaySteps: summary.todaySteps,
        todayCalories: summary.todayCalories,
        avgSleep: summary.avgSleep,
        avgHeartRate: summary.avgHeartRate,
      });
      setCoaching(text);
    } catch {
      // silent
    } finally {
      setCoachingLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={s.loadingText}>Lade Gesundheitsdaten...</Text>
      </View>
    );
  }

  const weekLabels = summary?.weeklyData.map(d => {
    const date = new Date(d.date);
    return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()];
  }) ?? [];

  const stepsData = summary?.weeklyData.map(d => d.steps) ?? [];
  const caloriesData = summary?.weeklyData.map(d => d.activeCalories) ?? [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Fitness</Text>

      {error && (
        <View style={s.errorBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.yellow} />
          <Text style={s.errorText}>Health-Daten nicht verfügbar – Demo-Daten werden angezeigt</Text>
        </View>
      )}

      {/* Stat Cards */}
      {summary && (
        <View style={s.statsGrid}>
          <StatCard icon="👣" label="Schritte" value={summary.todaySteps.toLocaleString()} sub="heute" />
          <StatCard icon="🔥" label="Kalorien" value={`${summary.todayCalories}`} sub="aktiv, kcal" />
          {summary.avgSleep !== undefined && <StatCard icon="😴" label="Schlaf" value={`${summary.avgSleep}h`} sub="letzte Nacht" />}
          {summary.avgHeartRate !== undefined && <StatCard icon="❤️" label="Herzrate" value={`${summary.avgHeartRate}`} sub="bpm Ø" />}
        </View>
      )}

      {/* Chart */}
      {summary && stepsData.length > 0 && (
        <View style={s.card}>
          <View style={s.chartHeader}>
            <Text style={s.cardTitle}>Letzte 7 Tage</Text>
            <View style={s.chartToggle}>
              <TouchableOpacity style={[s.toggleBtn, chartType === 'steps' && s.toggleActive]} onPress={() => setChartType('steps')}>
                <Text style={[s.toggleText, chartType === 'steps' && s.toggleTextActive]}>Schritte</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.toggleBtn, chartType === 'calories' && s.toggleActive]} onPress={() => setChartType('calories')}>
                <Text style={[s.toggleText, chartType === 'calories' && s.toggleTextActive]}>Kalorien</Text>
              </TouchableOpacity>
            </View>
          </View>
          <LineChart
            data={{
              labels: weekLabels,
              datasets: [{ data: chartType === 'steps' ? stepsData : caloriesData }],
            }}
            width={W - spacing.md * 2}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={s.chart}
            withInnerLines={true}
            withOuterLines={false}
          />
        </View>
      )}

      {/* Claude Fitness Coaching */}
      <View style={s.card}>
        <View style={s.cardHeaderRow}>
          <Ionicons name="barbell-outline" size={16} color={colors.accent} />
          <Text style={s.cardTitle}>Fitness-Coach</Text>
          <TouchableOpacity onPress={loadCoaching} style={s.refreshBtn}>
            <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        {coachingLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
        ) : coaching ? (
          <Text style={s.coachingText}>{coaching}</Text>
        ) : (
          <Text style={s.emptyText}>
            API-Key in Einstellungen hinterlegen, um personalisiertes Fitness-Coaching zu erhalten.
          </Text>
        )}
      </View>

      {/* Ziel-Fortschritt */}
      {summary && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Tages-Ziele</Text>
          <GoalBar label="Schritte" current={summary.todaySteps} target={10000} color={colors.accent} />
          <GoalBar label="Aktive Kalorien" current={summary.todayCalories} target={500} color={colors.green} />
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

function GoalBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <View style={s.goalRow}>
      <View style={s.goalLabels}>
        <Text style={s.goalLabel}>{label}</Text>
        <Text style={s.goalValue}>{current.toLocaleString()} / {target.toLocaleString()}</Text>
      </View>
      <View style={s.goalBar}>
        <View style={[s.goalFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: colors.bg },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, paddingTop: spacing.lg, marginBottom: spacing.md },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.yellow + '20', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md },
  errorText: { flex: 1, fontSize: 12, color: colors.yellow },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 2 },
  statIcon: { fontSize: 28 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textDim, fontWeight: '500' },
  statSub: { fontSize: 11, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  chartToggle: { flexDirection: 'row', gap: 4 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.surfaceHigh },
  toggleActive: { backgroundColor: colors.accentDim },
  toggleText: { fontSize: 12, color: colors.textMuted },
  toggleTextActive: { color: colors.accent },
  chart: { borderRadius: 8, marginLeft: -spacing.md },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  refreshBtn: { marginLeft: 'auto' },
  coachingText: { fontSize: 14, color: colors.textDim, lineHeight: 22 },
  emptyText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  goalRow: { marginTop: spacing.sm, gap: 6 },
  goalLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  goalLabel: { fontSize: 13, color: colors.textDim },
  goalValue: { fontSize: 13, color: colors.textMuted },
  goalBar: { height: 8, backgroundColor: colors.surfaceHigh, borderRadius: 4, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 4 },
});
