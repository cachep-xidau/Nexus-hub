// Prototype orchestrator — generates multi-file React projects via AI
// Uses Tauri shell plugin to scaffold Vite project and run dev server

import { Command } from '@tauri-apps/plugin-shell';
import { homeDir, join } from '@tauri-apps/api/path';
import { generateCompletion } from '../ai';
import { TEMPLATES } from './templates';

export interface PrototypeResult {
  status: 'generating' | 'building' | 'running' | 'error' | 'stopped';
  url?: string;
  port?: number;
  pid?: number;
  error?: string;
  files?: Record<string, string>;
}

// ── Vite project template (shipped inline) ──────────
const VITE_PACKAGE_JSON = `{
  "name": "nexus-prototype",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "lucide-react": "^0.460.0",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.0",
    "vite": "^6.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}`;

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: __PORT__,
    strictPort: true,
    open: false,
  },
})`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus Prototype</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

const MAIN_TSX = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`;

const VITE_ENV_DTS = `/// <reference types="vite/client" />`;

// ── Shell-based filesystem helpers ──────────────────

async function shellExec(program: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const cmd = Command.create(program, args);
  const output = await cmd.execute();
  return { code: output.code ?? 1, stdout: output.stdout, stderr: output.stderr };
}

async function shellMkdir(path: string): Promise<void> {
  // Use node to create directories (cross-platform, already scoped)
  await shellExec('node', ['-e', `require('fs').mkdirSync('${path.replace(/'/g, "\\'")}', { recursive: true })`]);
}

async function shellWriteFile(filePath: string, content: string): Promise<void> {
  // Use node to write files — handles any content safely via stdin
  // Use node with Base64 to avoid shell escaping issues
  const b64 = btoa(unescape(encodeURIComponent(content)));
  await shellExec('node', ['-e', `
        const fs = require('fs');
        const path = require('path');
        const content = Buffer.from('${b64}', 'base64').toString('utf8');
        const dir = path.dirname('${filePath.replace(/'/g, "\\'")}');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync('${filePath.replace(/'/g, "\\'")}', content);
    `]);
}

// ── Core functions ──────────────────────────────────

/**
 * Check if Node.js is installed on the system
 */
export async function checkNodeInstalled(): Promise<boolean> {
  try {
    const cmd = Command.create('node', ['--version']);
    const output = await cmd.execute();
    return output.code === 0;
  } catch {
    return false;
  }
}

/**
 * Generate prototype files via AI, scaffold Vite project, and start dev server
 */
export async function generatePrototype(
  projectId: string,
  prdContent: string,
  port: number,
  onStatus: (status: PrototypeResult) => void,
): Promise<PrototypeResult> {
  try {
    // Step 1: Generate code via AI
    onStatus({ status: 'generating' });

    // Strip YAML frontmatter from PRD (metadata like stepsCompleted, workflowType, etc.)
    let cleanPrd = prdContent;
    const fmMatch = cleanPrd.match(/^---\n[\s\S]*?\n---\n/);
    if (fmMatch) {
      cleanPrd = cleanPrd.substring(fmMatch[0].length).trim();
    }

    console.log('[Prototype] PRD length:', cleanPrd.length, 'chars');
    console.log('[Prototype] PRD preview:', cleanPrd.substring(0, 300));

    const template = TEMPLATES['prototype'];
    const prompt = template.prompt(cleanPrd);

    console.log('[Prototype] System prompt preview:', template.system.substring(0, 200));
    console.log('[Prototype] User prompt preview:', prompt.substring(0, 500));

    const rawOutput = await generateCompletion(template.system, prompt);

    console.log('[Prototype] AI response length:', rawOutput.length, 'chars');
    console.log('[Prototype] AI response preview:', rawOutput.substring(0, 300));

    // Parse AI output — robust JSON extraction
    let jsonStr = rawOutput.trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    jsonStr = jsonStr.replace(/^```[\w]*\n?/, '').replace(/\n?```\s*$/, '');

    // If there's text before the JSON object, extract just the JSON
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    let parsed: { files: Record<string, string> };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Last resort: try to find JSON pattern in raw output
      const match = rawOutput.match(/\{[\s\S]*"files"\s*:\s*\{[\s\S]*\}\s*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          return { status: 'error', error: 'AI output was not valid JSON. Try regenerating.' };
        }
      } else {
        return { status: 'error', error: 'AI output was not valid JSON. Try regenerating.' };
      }
    }

    if (!parsed.files || typeof parsed.files !== 'object') {
      return { status: 'error', error: 'AI output missing "files" object.' };
    }

    // Step 2: Create project directory using shell commands
    onStatus({ status: 'building', files: parsed.files });

    const home = await homeDir();
    const projectDir = await join(home, 'nexus-prototypes', projectId);

    // Clean up old prototype if exists (prevents stale files from previous generation)
    console.log('[Prototype] Cleaning up old directory:', projectDir);
    await shellExec('node', ['-e', `require('fs').rmSync('${projectDir.replace(/'/g, "\\'")}', { recursive: true, force: true })`]);

    // Create directory structure via shell
    await shellMkdir(await join(projectDir, 'src', 'components'));
    await shellMkdir(await join(projectDir, 'src', 'data'));

    // Write scaffold files via shell
    await shellWriteFile(await join(projectDir, 'package.json'), VITE_PACKAGE_JSON);
    await shellWriteFile(await join(projectDir, 'vite.config.ts'), VITE_CONFIG.replace('__PORT__', String(port)));
    await shellWriteFile(await join(projectDir, 'tsconfig.json'), TSCONFIG);
    await shellWriteFile(await join(projectDir, 'index.html'), INDEX_HTML);
    await shellWriteFile(await join(projectDir, 'src', 'main.tsx'), MAIN_TSX);
    await shellWriteFile(await join(projectDir, 'src', 'vite-env.d.ts'), VITE_ENV_DTS);

    // Write AI-generated files via shell (sanitize issues first)
    const FORBIDDEN_IMPORTS = /^\s*import\s+.*\s+from\s+['"](?:antd|@ant-design\/|@mui\/|@chakra-ui\/|@mantine\/|@headlessui\/|framer-motion|styled-components|@emotion\/|bootstrap|semantic-ui-react).*['"];?\s*$/gm;

    for (const [filePath, content] of Object.entries(parsed.files)) {
      let sanitized = content;

      // 1. Strip forbidden library imports
      sanitized = sanitized.replace(FORBIDDEN_IMPORTS, '// [removed: unsupported import]');

      // 2. Fix empty backtick expressions: {``} or {\`\`} → {""}
      sanitized = sanitized.replace(/\{\\?`\\?`\}/g, '{""}');
      sanitized = sanitized.replace(/\{`[^`]*`\}/g, (match) => {
        // Keep valid template literals, only fix empty ones
        if (match === '{``}') return '{""}';
        return match;
      });

      // 3. Remove stray icon={``} patterns → icon=""
      sanitized = sanitized.replace(/icon=\{\\?`[^`]*\\?`\}/g, 'icon=""');

      const fullPath = await join(projectDir, filePath);
      await shellWriteFile(fullPath, sanitized);
    }

    // Step 3: npm install
    onStatus({ status: 'building', files: parsed.files });

    const installCmd = Command.create('npm', ['install'], { cwd: projectDir });
    const installResult = await installCmd.execute();
    if (installResult.code !== 0) {
      return {
        status: 'error',
        error: `npm install failed: ${installResult.stderr}`,
        files: parsed.files,
      };
    }

    // Step 4: Start dev server
    const devCmd = Command.create('npm', ['run', 'dev'], { cwd: projectDir });
    const child = await devCmd.spawn();

    // Give Vite a moment to start
    await sleep(3000);

    const result: PrototypeResult = {
      status: 'running',
      url: `http://localhost:${port}`,
      port,
      pid: child.pid,
      files: parsed.files,
    };

    onStatus(result);
    return result;

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { status: 'error', error };
  }
}

/**
 * Stop a running prototype dev server
 */
export async function stopPrototype(pid: number): Promise<void> {
  try {
    const cmd = Command.create('kill', ['-9', String(pid)]);
    await cmd.execute();
  } catch {
    // Process may already be dead
  }
}

// ── Helpers ─────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
