import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../lib/theme';
import { saveApiKey, getApiKey } from '../lib/claude';
import { getStoredToken, clearToken } from '../lib/google';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');

  useEffect(() => {
    getApiKey().then(k => { if (k) { setSavedKey(k); setApiKey(k); } });
    getStoredToken().then(t => setGoogleConnected(!!t));
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    await saveApiKey(apiKey.trim());
    setSavedKey(apiKey.trim());
    Alert.alert('Gespeichert', 'Dein Anthropic API-Key wurde gespeichert.');
  };

  const handleDisconnectGoogle = async () => {
    Alert.alert('Google trennen', 'Google-Konto wirklich trennen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Trennen', style: 'destructive', onPress: async () => {
          await clearToken();
          setGoogleConnected(false);
        }
      },
    ]);
  };

  const maskKey = (key: string) => key ? key.slice(0, 8) + '...' + key.slice(-4) : '';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-down" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Einstellungen</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Claude / Anthropic */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={s.sectionTitle}>Claude AI</Text>
          </View>
          <Text style={s.sectionDesc}>
            Hinterlege deinen Anthropic API-Key um Morning Brief, Fitness-Coach und Chat zu aktivieren.
            API-Key erhältlich auf console.anthropic.com
          </Text>
          {savedKey ? (
            <View style={s.connectedRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              <Text style={s.connectedText}>API-Key gespeichert: {maskKey(savedKey)}</Text>
            </View>
          ) : null}
          <TextInput
            style={s.input}
            placeholder="sk-ant-..."
            placeholderTextColor={colors.textMuted}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={handleSaveApiKey}>
            <Text style={s.btnTextPrimary}>{savedKey ? 'Aktualisieren' : 'Speichern'}</Text>
          </TouchableOpacity>
        </View>

        {/* Google */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={s.sectionTitle}>Google Kalender & Gmail</Text>
          </View>
          <Text style={s.sectionDesc}>
            Verbinde deinen Google-Account für Kalender-Integration und Gmail-Zusammenfassungen.
            Du brauchst eine Google Cloud Project Client-ID.
          </Text>
          {googleConnected ? (
            <>
              <View style={s.connectedRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={s.connectedText}>Google verbunden</Text>
              </View>
              <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={handleDisconnectGoogle}>
                <Text style={s.btnTextDanger}>Google trennen</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={s.input}
                placeholder="Google Client-ID (OAuth 2.0)"
                placeholderTextColor={colors.textMuted}
                value={googleClientId}
                onChangeText={setGoogleClientId}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={s.hint}>
                Erstelle eine OAuth-Client-ID in der Google Cloud Console. Wähle "iOS" als App-Typ und füge "hub" als URL-Schema hinzu.
              </Text>
            </>
          )}
        </View>

        {/* Apple Health */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="heart-outline" size={18} color={colors.red} />
            <Text style={s.sectionTitle}>Apple Health</Text>
          </View>
          <Text style={s.sectionDesc}>
            Apple Health wird automatisch beim ersten Start der App (auf echtem iPhone) um Erlaubnis gebeten.
            Daten werden nur lokal verarbeitet und nie hochgeladen.
          </Text>
          <View style={s.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={s.infoText}>Im Simulator und auf Android werden Demo-Daten angezeigt.</Text>
          </View>
        </View>

        {/* Info */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={s.sectionTitle}>Über Personal Hub</Text>
          </View>
          <Text style={s.sectionDesc}>
            Version 1.0.0{'\n'}
            Gebaut mit Expo, React Native & Claude AI.{'\n'}
            Alle Daten werden lokal auf deinem Gerät gespeichert.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingTop: spacing.lg + spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sectionDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectedText: { fontSize: 13, color: colors.green },
  input: { backgroundColor: colors.surfaceHigh, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  btn: { padding: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.accent },
  btnDanger: { backgroundColor: colors.red + '20', borderWidth: 1, borderColor: colors.red },
  btnTextPrimary: { color: colors.text, fontWeight: '700', fontSize: 15 },
  btnTextDanger: { color: colors.red, fontWeight: '600', fontSize: 15 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
});
