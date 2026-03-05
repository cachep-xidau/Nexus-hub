import { getSetting } from './db';
import { tauriFetch } from './tauri-fetch';
import type { GmailEmail } from './db';

// ── Categories ───────────────────────────────────────
export const EMAIL_CATEGORIES = {
  important: { label: 'Important', color: '#ef4444', icon: '🔴' },
  updates: { label: 'Updates', color: '#3b82f6', icon: '📬' },
  promotions: { label: 'Promotions', color: '#f59e0b', icon: '🛍️' },
  social: { label: 'Social', color: '#8b5cf6', icon: '👥' },
  receipts: { label: 'Receipts', color: '#22c55e', icon: '📋' },
  automated: { label: 'Automated', color: '#6b7280', icon: '🤖' },
  uncategorized: { label: 'Other', color: '#9ca3af', icon: '📧' },
} as const;

export type EmailCategory = keyof typeof EMAIL_CATEGORIES;

// ── AI Classification (Gemini) ───────────────────────
export async function classifyEmails(emails: GmailEmail[]): Promise<GmailEmail[]> {
  const apiKey = await getSetting('google_ai_api_key');

  if (!apiKey) {
    // Fallback: rule-based classification
    return emails.map(e => ({ ...e, category: classifyByRules(e) }));
  }

  // Batch classify with Gemini
  try {
    const emailSummaries = emails.map((e, i) => (
      `[${i}] From: ${e.sender_name} <${e.sender_email}> | Subject: ${e.subject} | Snippet: ${e.snippet.slice(0, 100)}`
    )).join('\n');

    const prompt = `Classify each email into exactly one category. Categories:
- important: urgent, action required, personal messages from known contacts
- updates: notifications, status updates, service updates
- promotions: marketing, deals, newsletters, ads
- social: social media notifications, community updates
- receipts: order confirmations, invoices, payment receipts
- automated: automated system emails, CI/CD, cron notifications

Return ONLY a JSON array of category strings, one per email, in order.
Example: ["important","promotions","receipts"]

Emails:
${emailSummaries}`;

    const res = await tauriFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const categories: string[] = JSON.parse(match[0]);
        if (!Array.isArray(categories)) throw new Error('Not an array');
        return emails.map((e, i) => ({
          ...e,
          category: (i < categories.length && categories[i] in EMAIL_CATEGORIES)
            ? categories[i] as EmailCategory
            : classifyByRules(e),
        }));
      } catch (parseError) {
        console.warn('[Classifier] AI response parse failed, using rules:', parseError);
      }
    }
  } catch (e) {
    console.error('AI classification failed, using rules:', e);
  }

  // Fallback to rules
  return emails.map(e => ({ ...e, category: classifyByRules(e) }));
}

// ── Rule-based fallback ──────────────────────────────
function classifyByRules(email: GmailEmail): EmailCategory {
  const from = (email.sender_email || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const labels = (email.labels || '').toLowerCase();

  // Gmail label-based
  if (labels.includes('important') || labels.includes('starred')) return 'important';
  if (labels.includes('category_promotions')) return 'promotions';
  if (labels.includes('category_social')) return 'social';
  if (labels.includes('category_updates')) return 'updates';

  // Sender-based
  if (from.includes('noreply') || from.includes('no-reply') || from.includes('notifications@')) return 'automated';
  if (from.includes('newsletter') || from.includes('marketing') || from.includes('promo')) return 'promotions';

  // Subject-based
  if (subject.includes('receipt') || subject.includes('invoice') || subject.includes('order confirmation') || subject.includes('payment')) return 'receipts';
  if (subject.includes('urgent') || subject.includes('action required') || subject.includes('important')) return 'important';
  if (subject.includes('unsubscribe') || subject.includes('deal') || subject.includes('% off') || subject.includes('sale')) return 'promotions';

  return 'uncategorized';
}
