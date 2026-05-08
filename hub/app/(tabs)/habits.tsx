import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../lib/theme';
import { useHabitStore, Habit } from '../../store/useHabitStore';

const ICONS = ['⭐', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🎵'];
const COLORS = ['#7c6af7', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#f472b6', '#a78bfa', '#34d399'];

export default function HabitsScreen() {
  const { habits, goals, load, addHabit, removeHabit, toggleLog, isCompleted, getStreak, addGoal, updateGoalProgress, removeGoal } = useHabitStore();
  const [habitModal, setHabitModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [tab, setTab] = useState<'habits' | 'goals'>('habits');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { load(); }, []);

  const handleAddHabit = async () => {
    if (!newName.trim()) return;
    await addHabit(newName.trim(), selectedIcon, selectedColor);
    setNewName('');
    setSelectedIcon('⭐');
    setSelectedColor(COLORS[0]);
    setHabitModal(false);
  };

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    await addGoal(newGoalTitle.trim(), newGoalDesc.trim() || undefined);
    setNewGoalTitle('');
    setNewGoalDesc('');
    setGoalModal(false);
  };

  const confirmDeleteHabit = (habit: Habit) => {
    Alert.alert('Gewohnheit löschen', `"${habit.name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => removeHabit(habit.id) },
    ]);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Routinen</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => tab === 'habits' ? setHabitModal(true) : setGoalModal(true)}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'habits' && s.tabActive]} onPress={() => setTab('habits')}>
          <Text style={[s.tabLabel, tab === 'habits' && s.tabLabelActive]}>Gewohnheiten</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'goals' && s.tabActive]} onPress={() => setTab('goals')}>
          <Text style={[s.tabLabel, tab === 'goals' && s.tabLabelActive]}>Ziele</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {tab === 'habits' ? (
          habits.length === 0 ? (
            <Empty icon="flame-outline" text="Noch keine Gewohnheiten" sub="Tippe + um deine erste Gewohnheit hinzuzufügen" />
          ) : (
            habits.map(habit => {
              const done = isCompleted(habit.id, today);
              const streak = getStreak(habit.id);
              return (
                <View key={habit.id} style={s.habitCard}>
                  <TouchableOpacity style={[s.habitCheck, { borderColor: habit.color, backgroundColor: done ? habit.color + '30' : 'transparent' }]} onPress={() => toggleLog(habit.id, today)}>
                    <Text style={s.habitIcon}>{habit.icon}</Text>
                    {done && <Ionicons name="checkmark" size={14} color={habit.color} style={s.checkmark} />}
                  </TouchableOpacity>
                  <View style={s.habitInfo}>
                    <Text style={s.habitName}>{habit.name}</Text>
                    <View style={s.streakRow}>
                      <Ionicons name="flame" size={13} color={streak > 0 ? colors.yellow : colors.textMuted} />
                      <Text style={[s.streakText, { color: streak > 0 ? colors.yellow : colors.textMuted }]}>
                        {streak} Tage Streak
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => confirmDeleteHabit(habit)}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })
          )
        ) : (
          goals.length === 0 ? (
            <Empty icon="flag-outline" text="Noch keine Ziele" sub="Tippe + um dein erstes Ziel hinzuzufügen" />
          ) : (
            goals.map(goal => (
              <View key={goal.id} style={s.goalCard}>
                <View style={s.goalHeader}>
                  <Text style={s.goalTitle}>{goal.title}</Text>
                  <TouchableOpacity onPress={() => removeGoal(goal.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {goal.description && <Text style={s.goalDesc}>{goal.description}</Text>}
                <View style={s.progressRow}>
                  <View style={s.progressBar}>
                    <View style={[s.progressFill, { width: `${goal.progress}%`, backgroundColor: goal.completed ? colors.green : colors.accent }]} />
                  </View>
                  <Text style={s.progressText}>{goal.progress}%</Text>
                </View>
                <View style={s.progressBtns}>
                  {[25, 50, 75, 100].map(p => (
                    <TouchableOpacity key={p} style={[s.progressBtn, goal.progress === p && s.progressBtnActive]} onPress={() => updateGoalProgress(goal.id, p)}>
                      <Text style={[s.progressBtnText, goal.progress === p && s.progressBtnTextActive]}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={habitModal} transparent animationType="slide" onRequestClose={() => setHabitModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Neue Gewohnheit</Text>
            <TextInput style={s.input} placeholder="Name der Gewohnheit..." placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} autoFocus />
            <Text style={s.pickerLabel}>Icon</Text>
            <View style={s.iconGrid}>
              {ICONS.map(ic => (
                <TouchableOpacity key={ic} style={[s.iconBtn, selectedIcon === ic && s.iconBtnActive]} onPress={() => setSelectedIcon(ic)}>
                  <Text style={s.iconText}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.pickerLabel}>Farbe</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorBtn, { backgroundColor: c }, selectedColor === c && s.colorBtnActive]} onPress={() => setSelectedColor(c)} />
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setHabitModal(false)}>
                <Text style={s.cancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAddHabit}>
                <Text style={s.confirmText}>Erstellen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Neues Ziel</Text>
            <TextInput style={s.input} placeholder="Ziel..." placeholderTextColor={colors.textMuted} value={newGoalTitle} onChangeText={setNewGoalTitle} autoFocus />
            <TextInput style={[s.input, { marginTop: spacing.sm, minHeight: 80, textAlignVertical: 'top' }]} placeholder="Beschreibung (optional)..." placeholderTextColor={colors.textMuted} value={newGoalDesc} onChangeText={setNewGoalDesc} multiline />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setGoalModal(false)}>
                <Text style={s.cancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAddGoal}>
                <Text style={s.confirmText}>Erstellen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Empty({ icon, text, sub }: { icon: any; text: string; sub: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={s.emptyTitle}>{text}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingTop: spacing.lg + spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  tabLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: colors.accent },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  habitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  habitCheck: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  habitIcon: { fontSize: 24 },
  checkmark: { position: 'absolute', bottom: 2, right: 2 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '600', color: colors.text },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  streakText: { fontSize: 12, fontWeight: '500' },
  goalCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 8 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  goalDesc: { fontSize: 13, color: colors.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.surfaceHigh, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: colors.textDim, fontWeight: '600', minWidth: 36 },
  progressBtns: { flexDirection: 'row', gap: spacing.xs },
  progressBtn: { flex: 1, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.surfaceHigh, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  progressBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  progressBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  progressBtnTextActive: { color: colors.accent },
  empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, color: colors.textMuted, fontWeight: '600' },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  pickerLabel: { fontSize: 13, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm, fontWeight: '500' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surfaceHigh, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconBtnActive: { borderColor: colors.accent },
  iconText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: colors.text },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, alignItems: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center' },
  confirmText: { color: colors.text, fontWeight: '700' },
});
