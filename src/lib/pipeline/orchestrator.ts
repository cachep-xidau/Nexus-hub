// Pipeline orchestrator for artifact generation
// Adapted from ba-kit — runs locally using existing AI providers

import { generateCompletion } from '../ai';
import { createArtifact } from '../repo-db';
import { TEMPLATES, type ArtifactType } from './templates';

export interface GenerationResult {
    type: ArtifactType;
    id: string;
    status: 'success' | 'failed';
    error?: string;
}

export interface PipelineResult {
    artifacts: GenerationResult[];
    progress: number;
    status: 'running' | 'completed' | 'failed';
}

/**
 * Run the artifact generation pipeline.
 * Generates artifacts sequentially — ERD results feed into SQL generation.
 */
export async function runPipeline(
    functionId: string,
    projectId: string,
    artifactTypes: ArtifactType[],
    prdContent: string,
    onProgress?: (progress: number, current: ArtifactType) => void,
): Promise<PipelineResult> {
    const result: PipelineResult = {
        artifacts: [],
        progress: 0,
        status: 'running',
    };

    let erdContent: string | undefined;
    const total = artifactTypes.length;

    for (let i = 0; i < total; i++) {
        const type = artifactTypes[i];
        onProgress?.(Math.round((i / total) * 100), type);

        try {
            const template = TEMPLATES[type];

            // For SQL, use ERD content as context if available
            const context = type === 'sql' && erdContent ? erdContent : undefined;
            const prompt = template.prompt(prdContent, context);

            // Call AI provider
            const content = await generateCompletion(template.system, prompt);

            // Add traceability header
            const traced = addTraceability(content, type, projectId);

            // Save to database
            const id = await createArtifact({
                type,
                title: getDefaultTitle(type),
                content: traced,
                functionId,
                projectId,
            });

            // Cache ERD for SQL generation
            if (type === 'erd') {
                erdContent = content;
            }

            result.artifacts.push({ type, id, status: 'success' });
        } catch (err) {
            result.artifacts.push({
                type,
                id: '',
                status: 'failed',
                error: err instanceof Error ? err.message : String(err),
            });
        }

        result.progress = Math.round(((i + 1) / total) * 100);
    }

    result.status = result.artifacts.some(a => a.status === 'failed') ? 'failed' : 'completed';
    onProgress?.(100, artifactTypes[artifactTypes.length - 1]);

    return result;
}

function addTraceability(content: string, type: ArtifactType, projectId: string): string {
    return `---
artifact_type: ${type}
project_id: ${projectId}
generated_at: ${new Date().toISOString()}
---

${content}`;
}

function getDefaultTitle(type: ArtifactType): string {
    const titles: Record<string, string> = {
        'user-story': 'User Stories',
        'function-list': 'Function List',
        'srs': 'Software Requirements Specification',
        'erd': 'Entity-Relationship Diagram',
        'sql': 'SQL Scripts',
        'flowchart': 'Process Flowchart',
        'sequence-diagram': 'Sequence Diagram',
        'use-case-diagram': 'Use Case Diagram',
        'activity-diagram': 'Activity Diagram',
        'screen-description': 'Screen Description',
    };
    return titles[type] || type;
}
