import type { ArtifactType } from './templates';

export const AI_CALL_TIMEOUT_MS = 120_000;

export async function hashContent(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function addTraceability(
    content: string,
    artifactType: ArtifactType,
    projectId: string,
    provider: string,
): string {
    return `---
artifact_type: ${artifactType}
project_id: ${projectId}
generated_by: ${provider}
generated_at: ${new Date().toISOString()}
---

${content}`;
}

export const TYPE_LABELS: Record<string, string> = {
    'user-story': 'User Stories',
    'function-list': 'Function List',
    'srs': 'SRS',
    'erd': 'ERD (DBML)',
    'sql': 'SQL DDL',
    'screen-description': 'Screen Description',
    'flowchart': 'Flowchart',
    'sequence-diagram': 'Sequence Diagram',
    'use-case-diagram': 'Use Case Diagram',
    'activity-diagram': 'Activity Diagram',
};

export function stripYamlFrontmatter(text: string): string {
    const match = text.match(/^---\n[\s\S]*?\n---\n/);
    return match ? text.substring(match[0].length).trim() : text;
}
