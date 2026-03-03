export interface GmailHeader {
  name?: string;
  value?: string;
}

export interface GmailBodyData {
  data?: string;
}

export interface GmailPayloadPart {
  mimeType?: string;
  body?: GmailBodyData;
  filename?: string;
}

export interface GmailPayload {
  headers?: GmailHeader[];
  body?: GmailBodyData;
  parts?: GmailPayloadPart[];
}

function decodeBase64Url(input: string): string {
  try {
    return atob(input.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '';
  }
}

export function getGmailHeaderValue(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers || headers.length === 0) return '';
  const lowerName = name.toLowerCase();
  return headers.find((header) => header.name?.toLowerCase() === lowerName)?.value || '';
}

export function parseFromHeader(from: string): { senderName: string; senderEmail: string } {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/);
  if (!match) {
    return { senderName: from, senderEmail: from };
  }
  return { senderName: match[1].trim(), senderEmail: match[2] };
}

export function extractGmailBodyText(payload: GmailPayload | undefined, fallbackSnippet = ''): string {
  if (!payload) return fallbackSnippet;
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return decoded || fallbackSnippet;
  }
  if (payload.parts && payload.parts.length > 0) {
    const textPart = payload.parts.find((part) => part.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      const decoded = decodeBase64Url(textPart.body.data);
      return decoded || fallbackSnippet;
    }
  }
  return fallbackSnippet;
}

export function extractAttachmentNames(payload: GmailPayload | undefined): string[] {
  if (!payload?.parts || payload.parts.length === 0) return [];
  const names: string[] = [];
  for (const part of payload.parts) {
    if (typeof part.filename === 'string' && part.filename.length > 0) {
      names.push(part.filename);
    }
  }
  return names;
}
