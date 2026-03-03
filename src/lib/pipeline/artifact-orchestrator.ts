// Artifact generation batch pipeline.

import type { ArtifactType } from './templates';
import { TEMPLATES } from './templates';
import { generateCompletion, detectProvider } from '../ai';
import { api } from '../api-client';
import {
    AI_CALL_TIMEOUT_MS,
    TYPE_LABELS,
    addTraceability,
    hashContent,
    stripYamlFrontmatter,
} from './artifact-orchestrator-helpers';

// ── Types ────────────────────────────────────────────

export interface ArtifactResult {
    type: ArtifactType;
    id: string;
    status: 'success' | 'failed';
    error?: string;
}

export interface PipelineProgress {
    current: number;
    total: number;
    currentType: ArtifactType;
    status: 'generating' | 'saving' | 'done' | 'failed';
    results: ArtifactResult[];
}

export interface PipelineResult {
    status: 'completed' | 'failed' | 'cancelled';
    results: ArtifactResult[];
    startedAt: number;
    completedAt: number;
}

/** Non-prototype artifact types in recommended generation order */
export const GENERABLE_TYPES: ArtifactType[] = [
    'user-story',
    'function-list',
    'srs',
    'erd',
    'sql',
    'screen-description',
    'flowchart',
    'sequence-diagram',
    'use-case-diagram',
    'activity-diagram',
];

// ── Pipeline Runner ──────────────────────────────────

// Run artifact generation pipeline for a project.
export async function runArtifactPipeline(
    projectId: string,
    functionId: string | null,
    artifactTypes: ArtifactType[],
    prdContent: string,
    onProgress: (progress: PipelineProgress) => void,
    signal?: AbortSignal,
    context?: string,
): Promise<PipelineResult> {
    const startedAt = Date.now();
    const results: ArtifactResult[] = [];
    let erdContent: string | undefined;

    // Resolve active AI provider for traceability metadata.
    const providerConfig = await detectProvider();
    const providerName = providerConfig?.provider || 'unknown';

    // Hash source PRD to support artifact traceability/dedup context.
    const sourceHash = await hashContent(prdContent);

    const cleanPrd = stripYamlFrontmatter(prdContent);

    const total = artifactTypes.length;

    for (let i = 0; i < total; i++) {
        // Honor cancellation between artifact steps.
        if (signal?.aborted) {
            return {
                status: 'cancelled',
                results,
                startedAt,
                completedAt: Date.now(),
            };
        }

        const type = artifactTypes[i];
        const template = TEMPLATES[type];
        if (!template) {
            results.push({ type, id: '', status: 'failed', error: `No template for type: ${type}` });
            continue;
        }

        // Emit progress before generation starts for current artifact.
        onProgress({
            current: i + 1,
            total,
            currentType: type,
            status: 'generating',
            results: [...results],
        });

        try {
            // For SQL, reuse generated ERD as context to improve DDL quality.
            const aiContext = type === 'sql' && erdContent ? erdContent : context;
            const prompt = template.prompt(cleanPrd, aiContext);

            // Execute AI call with timeout
            const rawContent = await Promise.race([
                generateCompletion(template.system, prompt),
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error(`AI call timed out after ${AI_CALL_TIMEOUT_MS / 1000}s`)),
                        AI_CALL_TIMEOUT_MS,
                    ),
                ),
            ]);

            // Cache ERD output for SQL chaining
            if (type === 'erd') {
                erdContent = rawContent;
            }

            // Add traceability header
            const content = addTraceability(rawContent, type, projectId, providerName);

            // Progress: saving
            onProgress({
                current: i + 1,
                total,
                currentType: type,
                status: 'saving',
                results: [...results],
            });

            // Save via API
            const title = TYPE_LABELS[type] || type;
            const artifact = await api.post<{ id: string }>('/api/artifacts', {
                type,
                title,
                content,
                functionId: functionId || undefined,
                projectId,
                sourceHash,
            });

            results.push({ type, id: artifact.id, status: 'success' });
            console.log(`✅ Pipeline: ${type} generated successfully`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            results.push({ type, id: '', status: 'failed', error: errorMsg });
            console.error(`❌ Pipeline: ${type} failed —`, errorMsg);
        }
    }

    const finalStatus = results.some(r => r.status === 'failed') ? 'failed' : 'completed';

    // Final progress
    onProgress({
        current: total,
        total,
        currentType: artifactTypes[total - 1],
        status: 'done',
        results,
    });

    console.log(
        `🏁 Pipeline: ${finalStatus} — ${results.filter(r => r.status === 'success').length}/${total} artifacts`,
    );

    return {
        status: finalStatus,
        results,
        startedAt,
        completedAt: Date.now(),
    };
}
