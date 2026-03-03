import { saveSetting } from './db';
import { encrypt } from './crypto';

type EnvSettingMap = {
  envKey: string;
  settingKey: string;
};

const ENV_TO_SETTING_MAP: EnvSettingMap[] = [
  { envKey: 'VITE_OPENAI_API_KEY', settingKey: 'openai_api_key' },
  { envKey: 'VITE_GOOGLE_AI_API_KEY', settingKey: 'google_ai_api_key' },
  { envKey: 'VITE_GLK5_BASE_URL', settingKey: 'glk5_base_url' },
  { envKey: 'VITE_GLK5_AUTH_TOKEN', settingKey: 'glk5_auth_token' },
  { envKey: 'VITE_SLACK_BOT_TOKEN', settingKey: 'slack_bot_token' },
  { envKey: 'VITE_TELEGRAM_BOT_TOKEN', settingKey: 'telegram_bot_token' },
  { envKey: 'VITE_TRELLO_API_KEY', settingKey: 'trello_api_key' },
  { envKey: 'VITE_TRELLO_TOKEN', settingKey: 'trello_token' },
  { envKey: 'VITE_GMAIL_OAUTH_CLIENT_ID', settingKey: 'gmail_oauth_client_id' },
];

function readEnv(envKey: string): string {
  const value = import.meta.env[envKey];
  return typeof value === 'string' ? value.trim() : '';
}

export async function syncOnlineCredentialsToLocalSettings(): Promise<void> {
  for (const mapping of ENV_TO_SETTING_MAP) {
    const value = readEnv(mapping.envKey);
    if (!value) continue;
    await saveSetting(mapping.settingKey, value);
  }

  const gmailOauthClientSecret = readEnv('VITE_GMAIL_OAUTH_CLIENT_SECRET');
  if (gmailOauthClientSecret) {
    await saveSetting('gmail_oauth_client_secret_enc', await encrypt(gmailOauthClientSecret));
  }
}
