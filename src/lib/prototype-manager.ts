// Singleton manager for running prototype dev server processes
// Handles port allocation, cleanup, and lifecycle

import { stopPrototype } from './pipeline/prototype-orchestrator';

interface RunningPrototype {
    projectId: string;
    port: number;
    pid: number;
    startedAt: number;
}

const BASE_PORT = 5174;
const MAX_PROTOTYPES = 5;
const AUTO_KILL_MS = 30 * 60 * 1000; // 30 minutes

class PrototypeManager {
    private running: Map<string, RunningPrototype> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Auto-cleanup stale prototypes every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupStale();
        }, 5 * 60 * 1000);

        // Cleanup on window close
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.stopAll();
            });
        }
    }

    /**
     * Get next available port
     */
    getNextPort(): number {
        const usedPorts = new Set([...this.running.values()].map(r => r.port));
        for (let p = BASE_PORT; p < BASE_PORT + MAX_PROTOTYPES; p++) {
            if (!usedPorts.has(p)) return p;
        }
        return BASE_PORT + MAX_PROTOTYPES; // fallback
    }

    /**
     * Register a running prototype
     */
    register(projectId: string, port: number, pid: number): void {
        // Stop existing prototype for this project if running
        if (this.running.has(projectId)) {
            this.stop(projectId);
        }
        this.running.set(projectId, {
            projectId,
            port,
            pid,
            startedAt: Date.now(),
        });
    }

    /**
     * Stop a specific prototype
     */
    async stop(projectId: string): Promise<void> {
        const proto = this.running.get(projectId);
        if (proto) {
            await stopPrototype(proto.pid);
            this.running.delete(projectId);
        }
    }

    /**
     * Stop all running prototypes
     */
    async stopAll(): Promise<void> {
        const promises = [...this.running.keys()].map(id => this.stop(id));
        await Promise.allSettled(promises);
    }

    /**
     * Get running prototype for a project
     */
    get(projectId: string): RunningPrototype | undefined {
        return this.running.get(projectId);
    }

    /**
     * Check if a prototype is running for a project
     */
    isRunning(projectId: string): boolean {
        return this.running.has(projectId);
    }

    /**
     * Kill stale prototypes (older than AUTO_KILL_MS)
     */
    private async cleanupStale(): Promise<void> {
        const now = Date.now();
        for (const [id, proto] of this.running) {
            if (now - proto.startedAt > AUTO_KILL_MS) {
                await this.stop(id);
            }
        }
    }

    /**
     * Cleanup on destroy
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.stopAll();
    }
}

// Singleton instance
export const prototypeManager = new PrototypeManager();
