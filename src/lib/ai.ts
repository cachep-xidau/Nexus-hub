import { tauriFetch } from './tauri-fetch';
import { getSetting } from './db';

const SYSTEM_PROMPT = `You are Nexus, an AI assistant embedded in a Kanban-based project management hub. You help users manage tasks from multiple communication channels (Slack, Gmail, Telegram).

Your capabilities:
- Analyze messages from different channels and extract actionable tasks
- Create Kanban cards from messages with appropriate priority and labels
- Summarize channel activity and unread messages
- Answer questions about projects, tasks, and workflows
- Help prioritize and organize work

Be concise, actionable, and direct. Format responses in markdown.`;

// ── Provider types ──────────────────────────────────
export type AIProvider = 'glk5' | 'google_ai' | 'openai';

interface ProviderConfig {
  provider: AIProvider;
  label: string;
}

// ── Auto-detect best available provider ─────────────
export async function detectProvider(): Promise<ProviderConfig | null> {
  // 1. Check user's preferred provider from Settings
  const active = await getSetting('active_ai_provider');
  if (active) {
    if (active === 'glk5') {
      const t = await getSetting('glk5_auth_token');
      const u = await getSetting('glk5_base_url');
      if (t && u) return { provider: 'glk5', label: 'GLK-5 (Claude)' };
    }
    if (active === 'google_ai') {
      const k = await getSetting('google_ai_api_key');
      if (k) return { provider: 'google_ai', label: 'Google AI (Gemini)' };
    }
    if (active === 'openai') {
      const k = await getSetting('openai_api_key');
      if (k) return { provider: 'openai', label: 'OpenAI' };
    }
  }

  // 2. Fallback: first configured provider
  const glk5Token = await getSetting('glk5_auth_token');
  const glk5Url = await getSetting('glk5_base_url');
  if (glk5Token && glk5Url) return { provider: 'glk5', label: 'GLK-5 (Claude)' };

  const googleKey = await getSetting('google_ai_api_key');
  if (googleKey) return { provider: 'google_ai', label: 'Google AI (Gemini)' };

  const openaiKey = await getSetting('openai_api_key');
  if (openaiKey) return { provider: 'openai', label: 'OpenAI' };

  return null;
}

// ── Main chat function ──────────────────────────────
export async function chatStream(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onDone: () => void
) {
  try {
    const config = await detectProvider();
    if (!config) {
      onChunk('⚠️ No AI provider configured. Go to **Settings** → add API keys.');
      onDone();
      return;
    }

    switch (config.provider) {
      case 'glk5':
        await streamGLK5(messages, onChunk);
        break;
      case 'google_ai':
        await streamGoogleAI(messages, onChunk);
        break;
      case 'openai':
        await streamOpenAI(messages, onChunk);
        break;
    }
  } catch (error) {
    onChunk(`\n\n⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    onDone();
  }
}

// ── GLK-5 (Anthropic Claude) ────────────────────────
async function streamGLK5(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void
) {
  const baseUrl = await getSetting('glk5_base_url') || '';
  const token = await getSetting('glk5_auth_token') || '';

  const res = await tauriFetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': token,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GLK-5 error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || 'No response';
  onChunk(text);
}

// ── Google AI (Gemini) ──────────────────────────────
async function streamGoogleAI(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void
) {
  const key = await getSetting('google_ai_api_key') || '';

  // Build Gemini content format
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Understood. I am Nexus, ready to help.' }] },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  const res = await tauriFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  onChunk(text);
}

// ── OpenAI ──────────────────────────────────────────
async function streamOpenAI(
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void
) {
  const key = await getSetting('openai_api_key') || '';

  const res = await tauriFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || 'No response';
  onChunk(text);
}

// ── Non-streaming completion for artifact generation ─
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = await detectProvider();
  if (!config) throw new Error('No AI provider configured. Go to Settings → add API keys.');

  // Detect if the prompt is requesting JSON output (for prototype generation)
  const wantsJson = systemPrompt.includes('valid JSON object') || userPrompt.includes('JSON output');

  switch (config.provider) {
    case 'glk5': {
      const baseUrl = await getSetting('glk5_base_url') || '';
      const token = await getSetting('glk5_auth_token') || '';
      const res = await tauriFetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': token,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16384,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`GLK-5 error: ${res.status} ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    case 'google_ai': {
      const key = await getSetting('google_ai_api_key') || '';
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. Ready to generate.' }] },
        { role: 'user', parts: [{ text: userPrompt }] },
      ];

      // Use JSON response mode when requesting structured output
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: 65536,
      };
      if (wantsJson) {
        generationConfig.responseMimeType = 'application/json';
      }

      const res = await tauriFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Google AI error: ${res.status} ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    case 'openai': {
      const key = await getSetting('openai_api_key') || '';
      const body: Record<string, unknown> = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      };
      if (wantsJson) {
        body.response_format = { type: 'json_object' };
      }

      const res = await tauriFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error: ${res.status} ${err.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }
}
