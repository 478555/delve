import Anthropic from '@anthropic-ai/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE = 'anthropic_api_key';

let client: Anthropic | null = null;

export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY_STORAGE);
}

export async function saveApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE, key);
  client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

export async function getClient(): Promise<Anthropic | null> {
  if (client) return client;
  const key = await getApiKey();
  if (!key) return null;
  client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  return client;
}

export interface ContextData {
  habits?: { name: string; streak: number; completedToday: boolean }[];
  tasks?: { title: string; dueDate?: string; priority: number }[];
  fitness?: {
    todaySteps: number;
    todayCalories: number;
    avgSleep?: number;
    avgHeartRate?: number;
  };
  calendarEvents?: { title: string; start: string; end: string }[];
  emails?: { subject: string; from: string; snippet: string }[];
}

function buildSystemPrompt(ctx: ContextData): string {
  const lines: string[] = [
    'Du bist ein persönlicher KI-Assistent und Life Coach. Du kennst den Nutzer gut und bist direkt, motivierend und hilfreich.',
    'Antworte auf Deutsch, kurz und konkret.',
    '',
    '## Aktuelle Nutzerdaten:',
  ];

  if (ctx.habits && ctx.habits.length > 0) {
    lines.push('\n### Gewohnheiten heute:');
    ctx.habits.forEach(h => {
      lines.push(`- ${h.name}: ${h.completedToday ? '✅ erledigt' : '⏳ ausstehend'} (Streak: ${h.streak} Tage)`);
    });
  }

  if (ctx.tasks && ctx.tasks.length > 0) {
    lines.push('\n### Offene Aufgaben:');
    ctx.tasks.slice(0, 5).forEach(t => {
      lines.push(`- ${t.title}${t.dueDate ? ` (fällig: ${t.dueDate})` : ''}`);
    });
  }

  if (ctx.fitness) {
    lines.push('\n### Heutige Fitness-Daten:');
    lines.push(`- Schritte: ${ctx.fitness.todaySteps.toLocaleString()}`);
    lines.push(`- Kalorien (aktiv): ${ctx.fitness.todayCalories} kcal`);
    if (ctx.fitness.avgSleep) lines.push(`- Schlaf letzte Nacht: ${ctx.fitness.avgSleep}h`);
    if (ctx.fitness.avgHeartRate) lines.push(`- Ø Herzfrequenz: ${ctx.fitness.avgHeartRate} bpm`);
  }

  if (ctx.calendarEvents && ctx.calendarEvents.length > 0) {
    lines.push('\n### Heutige Termine:');
    ctx.calendarEvents.forEach(e => {
      const time = e.start ? new Date(e.start).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }) : '';
      lines.push(`- ${time} ${e.title}`);
    });
  }

  return lines.join('\n');
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(
  messages: Message[],
  context: ContextData
): Promise<string> {
  const c = await getClient();
  if (!c) throw new Error('Kein API-Key gesetzt. Bitte in den Einstellungen konfigurieren.');

  const response = await c.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(context),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Unerwarteter Antworttyp');
  return block.text;
}

export async function generateMorningBrief(context: ContextData): Promise<string> {
  const c = await getClient();
  if (!c) return '';

  const today = new Date().toLocaleDateString('de', { weekday: 'long', day: 'numeric', month: 'long' });
  const prompt = `Erstelle eine motivierende und prägnante Morgen-Zusammenfassung für ${today}.
Berücksichtige: offene Aufgaben, heutige Termine, Gewohnheiten und Fitness-Daten.
Schreibe 3-4 kurze Punkte. Sei direkt und motivierend. Auf Deutsch.`;

  const response = await c.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: buildSystemPrompt(context),
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== 'text') return '';
  return block.text;
}

export async function generateFitnessCoaching(fitness: ContextData['fitness']): Promise<string> {
  const c = await getClient();
  if (!c || !fitness) return '';

  const response = await c.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'Du bist ein erfahrener Personal Trainer und Fitness Coach. Antworte auf Deutsch, kurz und praxisnah.',
    messages: [{
      role: 'user',
      content: `Analysiere meine heutigen Fitness-Daten und gib mir 2-3 konkrete Empfehlungen:
Schritte heute: ${fitness.todaySteps}
Aktive Kalorien: ${fitness.todayCalories} kcal
${fitness.avgSleep !== undefined ? `Schlaf letzte Nacht: ${fitness.avgSleep}h` : ''}
${fitness.avgHeartRate !== undefined ? `Ø Herzfrequenz: ${fitness.avgHeartRate} bpm` : ''}

Sei direkt und motivierend.`,
    }],
  });

  const block = response.content[0];
  if (block.type !== 'text') return '';
  return block.text;
}
