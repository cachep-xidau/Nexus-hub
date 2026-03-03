// Legacy pipeline adapter for artifact generation.
// Kept for compatibility with GenerateModal.

import type { ArtifactType } from './templates';
import { runArtifactPipeline } from './artifact-orchestrator';

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

// Legacy wrapper keeping the older runPipeline signature used by GenerateModal.
export async function runPipeline(
    functionId: string,
    projectId: string,
    artifactTypes: ArtifactType[],
    prdContent: string,
    onProgress?: (progress: number, current: ArtifactType) => void,
): Promise<PipelineResult> {
    if (artifactTypes.length === 0) {
        return {
            artifacts: [],
            progress: 100,
            status: 'completed',
        };
    }

    const result = await runArtifactPipeline(
        projectId,
        functionId,
        artifactTypes,
        prdContent,
        (progress) => {
            const pct = Math.round((progress.current / progress.total) * 100);
            onProgress?.(pct, progress.currentType);
        },
    );

    return {
        artifacts: result.results,
        progress: 100,
        status: result.status === 'completed' ? 'completed' : 'failed',
    };
}
