import {
  getGmailAccounts, getGmailAccount, saveGmailAccount, deleteGmailAccount,
  getNextAccountColor,
} from './db';
import { saveSetting, deleteSetting } from './db';
import { tauriFetch } from './tauri-fetch';
import { encrypt, decrypt } from './crypto';

// ── Constants ────────────────────────────────────────
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// ── Types ────────────────────────────────────────────
export interface GmailAccountInfo {
  id: string;
  email: string;
  name: string;
  photo: string;
  color: string;
  connected: boolean;
}

// ── OAuth URL Builder ────────────────────────────────
export function buildOAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ── Add new Gmail account ────────────────────────────
export async function addGmailAccount(
  clientId: string,
  clientSecret: string,
  authCode: string
): Promise<{ success: boolean; error?: string; accountId?: string }> {
  try {
    console.log('[Gmail Auth] Adding new account...');

    // Exchange auth code for tokens
    const res = await tauriFetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await res.json();
    if (data.error) return { success: false, error: data.error_description || data.error };
    if (!data.access_token) return { success: false, error: 'No access token received' };

    // Fetch profile
    const profile = await fetchProfile(data.access_token);
    if (!profile.email) return { success: false, error: 'Could not fetch email address' };

    // Encrypt sensitive data
    const [secretEnc, refreshEnc, accessEnc] = await Promise.all([
      encrypt(clientSecret),
      data.refresh_token ? encrypt(data.refresh_token) : Promise.resolve(''),
      encrypt(data.access_token),
    ]);

    // Get color for this account
    const existing = await getGmailAccounts();
    const color = getNextAccountColor(existing.length);

    // Save account
    const accountId = crypto.randomUUID();
    await saveGmailAccount({
      id: accountId,
      email: profile.email,
      name: profile.name || '',
      photo: profile.photo || '',
      client_id: clientId,
      client_secret_enc: secretEnc,
      refresh_token_enc: refreshEnc,
      access_token_enc: accessEnc,
      token_expiry: Date.now() + (data.expires_in || 3600) * 1000,
      color,
      created_at: Date.now(),
    });

    // Persist oauth credentials in settings for parity with AI provider storage
    await saveSetting('gmail_oauth_client_id', clientId);
    await saveSetting('gmail_oauth_client_secret_enc', secretEnc);

    // Legacy non-sensitive keys used by Inbox fallback
    await saveSetting('gmail_client_id', clientId);
    await saveSetting('gmail_email', profile.email);

    console.log('[Gmail Auth] Account added:', profile.email);
    return { success: true, accountId };
  } catch (e: unknown) {
    console.error('[Gmail Auth] Add account failed:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to add account' };
  }
}

// ── Refresh access token for an account ──────────────
export async function refreshAccountToken(accountId: string): Promise<string | null> {
  try {
    const account = await getGmailAccount(accountId);
    if (!account || !account.refresh_token_enc) return null;

    // Check if token is still valid
    if (account.access_token_enc && Date.now() < account.token_expiry - 60000) {
      return decrypt(account.access_token_enc);
    }

    const clientSecret = await decrypt(account.client_secret_enc);
    const refreshToken = await decrypt(account.refresh_token_enc);

    const res = await tauriFetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: account.client_id,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await res.json();
    if (data.error) {
      console.error('[Gmail Auth] Refresh failed for', account.email, data.error);
      return null;
    }

    // Update account with new token
    const accessEnc = await encrypt(data.access_token);
    await saveGmailAccount({
      ...account,
      access_token_enc: accessEnc,
      token_expiry: Date.now() + (data.expires_in || 3600) * 1000,
    });

    return data.access_token;
  } catch (e) {
    console.error('[Gmail Auth] Refresh error:', e);
    return null;
  }
}

// ── Remove account ───────────────────────────────────
export async function removeGmailAccount(accountId: string): Promise<void> {
  await deleteGmailAccount(accountId);
  const remaining = await getGmailAccounts();

  if (remaining.length === 0) {
    await deleteSetting('gmail_client_id');
    await deleteSetting('gmail_client_secret');
    await deleteSetting('gmail_refresh_token');
    await deleteSetting('gmail_email');
  } else {
    const first = remaining[0];
    await saveSetting('gmail_client_id', first.client_id);
    await deleteSetting('gmail_client_secret');
    await deleteSetting('gmail_refresh_token');
    await saveSetting('gmail_email', first.email);
  }

  console.log('[Gmail Auth] Account removed:', accountId);
}

// ── Get all account infos ────────────────────────────
export async function getGmailAccountList(): Promise<GmailAccountInfo[]> {
  const accounts = await getGmailAccounts();
  return accounts.map(a => ({
    id: a.id,
    email: a.email,
    name: a.name,
    photo: a.photo,
    color: a.color,
    connected: !!a.refresh_token_enc,
  }));
}

// ── Check if any account is connected ────────────────
export async function isGmailConnected(): Promise<boolean> {
  const accounts = await getGmailAccounts();
  return accounts.length > 0;
}

// ── Fetch profile from Google ────────────────────────
async function fetchProfile(accessToken: string): Promise<{ email: string; name: string; photo: string }> {
  try {
    const gmailRes = await tauriFetch(GMAIL_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const gmailData = await gmailRes.json();

    const userinfoRes = await tauriFetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userinfo = await userinfoRes.json();

    return {
      email: gmailData.emailAddress || userinfo.email || '',
      name: userinfo.name || '',
      photo: userinfo.picture || '',
    };
  } catch (e) {
    console.error('[Gmail Auth] Profile fetch failed:', e);
    return { email: '', name: '', photo: '' };
  }
}
