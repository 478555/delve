import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const TOKEN_KEY = 'google_token';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function createGoogleAuthRequest(clientId: string) {
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'hub' });
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
  });
  return { request, discovery, redirectUri };
}

export async function fetchTodayEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);
  const data = await res.json();

  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    title: item.summary ?? 'Kein Titel',
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end: item.end?.dateTime ?? item.end?.date ?? '',
    location: item.location,
    description: item.description,
  }));
}

export async function fetchRecentEmails(accessToken: string, maxResults = 5): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail API error: ${listRes.status}`);
  const listData = await listRes.json();
  const messages: GmailMessage[] = [];

  for (const msg of listData.messages ?? []) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msgData = await msgRes.json();
    const headers = msgData.payload?.headers ?? [];
    const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value ?? '';
    messages.push({
      id: msg.id,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      snippet: msgData.snippet ?? '',
      date: getHeader('Date'),
      unread: (msgData.labelIds ?? []).includes('UNREAD'),
    });
  }
  return messages;
}
