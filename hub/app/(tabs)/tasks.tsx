import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../lib/theme';
import { useTaskStore, Task, Priority } from '../../store/useTaskStore';

const PRIORITY_LABELS: Record<Priority, { label: string; color: string }> = {
  1: { label: 'Niedrig', color: colors.textMuted },
  2: { label: 'Mittel', color: colors.yellow },
  3: { label: 'Hoch', color: colors.red },
};

export default function TasksScreen() {
  const { tasks, loading, load, add, toggle, remove } = useTaskStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>(1);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');

  useEffect(() => { load(); }, []);

  const filtered = tasks.filter(t => {
    if (filter === 'open') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await add(newTitle.trim(), { priority: newPriority });
    setNewTitle('');
    setNewPriority(1);
    setModalVisible(false);
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Aufgabe löschen', `"${task.title}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => remove(task.id) },
    ]);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Aufgaben</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {(['open', 'all', 'done'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterLabel, filter === f && s.filterLabelActive]}>
              {f === 'open' ? 'Offen' : f === 'done' ? 'Erledigt' : 'Alle'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TaskItem task={item} onToggle={() => toggle(item.id)} onDelete={() => handleDelete(item)} />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>Keine Aufgaben</Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Neue Aufgabe</Text>
            <TextInput
              style={s.input}
              placeholder="Aufgabe eingeben..."
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Text style={s.priorityLabel}>Priorität</Text>
            <View style={s.priorityRow}>
              {([1, 2, 3] as Priority[]).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[s.priorityBtn, newPriority === p && { backgroundColor: PRIORITY_LABELS[p].color + '30', borderColor: PRIORITY_LABELS[p].color }]}
                  onPress={() => setNewPriority(p)}
                >
                  <Text style={[s.priorityBtnText, newPriority === p && { color: PRIORITY_LABELS[p].color }]}>
                    {PRIORITY_LABELS[p].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleAdd}>
                <Text style={s.confirmText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function TaskItem({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const { label, color } = PRIORITY_LABELS[task.priority];
  return (
    <View style={s.taskCard}>
      <TouchableOpacity style={s.checkbox} onPress={onToggle}>
        <Ionicons
          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={task.completed ? colors.green : colors.textMuted}
        />
      </TouchableOpacity>
      <View style={s.taskContent}>
        <Text style={[s.taskTitle, task.completed && s.taskDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={s.taskMeta}>
          <View style={[s.priorityTag, { backgroundColor: color + '20' }]}>
            <Text style={[s.priorityTagText, { color }]}>{label}</Text>
          </View>
          {task.dueDate && (
            <Text style={s.dueDate}>📅 {new Date(task.dueDate).toLocaleDateString('de')}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={s.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingTop: spacing.lg + spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  filterLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  filterLabelActive: { color: colors.accent },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  taskCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  checkbox: { marginTop: 2 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, color: colors.text, fontWeight: '500', lineHeight: 22 },
  taskDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  taskMeta: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
  priorityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityTagText: { fontSize: 11, fontWeight: '600' },
  dueDate: { fontSize: 11, color: colors.textMuted },
  deleteBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textMuted },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  priorityLabel: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm, fontWeight: '500' },
  priorityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  priorityBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  priorityBtnText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceHigh, alignItems: 'center' },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center' },
  confirmText: { color: colors.text, fontWeight: '700' },
});
