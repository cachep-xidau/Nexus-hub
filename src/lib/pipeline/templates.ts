// Prompt templates for BSA artifact generation
// Ported from ba-kit/apps/api/src/pipeline/templates.ts

export type ArtifactType =
    | 'user-story' | 'function-list' | 'srs' | 'erd' | 'sql'
    | 'flowchart' | 'sequence-diagram' | 'use-case-diagram'
    | 'activity-diagram' | 'screen-description' | 'prototype';

interface TemplateEntry {
    system: string;
    prompt: (prdContent: string, context?: string) => string;
}

export const TEMPLATES: Record<ArtifactType, TemplateEntry> = {
    'user-story': {
        system: `You are an expert Business Systems Analyst. Generate user stories in industry-standard format.
Output as structured markdown:

## US-{number}: {title}

**As a** {role}
**I want to** {action}
**So that** {benefit}

### Acceptance Criteria
- [ ] AC-1: {criterion}

### Priority: {High|Medium|Low}
### Story Points: {estimate}`,
        prompt: (prd) => `Analyze the following PRD and generate comprehensive user stories.
Group stories by epic/feature area. Include acceptance criteria for each story.

PRD Content:
${prd}`,
    },

    'function-list': {
        system: `You are an expert BSA generating a Function List. Output a structured markdown table.

| # | Function ID | Function Name | Description | Screen/Module | Input | Output | Business Rules | Priority |
|---|------------|---------------|-------------|---------------|-------|--------|----------------|----------|

Include all functional requirements derived from the PRD.`,
        prompt: (prd, ctx) => {
            let p = `Analyze the following PRD and extract all functional requirements into a Function List.\n\nPRD Content:\n${prd}`;
            if (ctx) p += `\n\nAdditional Context:\n${ctx}`;
            return p;
        },
    },

    'srs': {
        system: `You are an expert BSA writing a Software Requirements Specification (SRS).
Follow IEEE 830 structure. Output structured markdown.

Include: 1. Introduction 2. Overall Description 3. Specific Requirements 4. System Features 5. Data Requirements 6. External Interface Requirements`,
        prompt: (prd, ctx) => {
            let p = `Generate a comprehensive SRS document from the following PRD.\n\nPRD Content:\n${prd}`;
            if (ctx) p += `\n\nAdditional Context:\n${ctx}`;
            return p;
        },
    },

    'erd': {
        system: `You are an expert database architect. Generate an Entity-Relationship Diagram in DBML notation (dbdiagram.io compatible).

Format:
\`\`\`dbml
Table table_name {
  id integer [pk, increment]
  field_name type [not null, note: 'description']
}
Ref: table_a.field > table_b.field
\`\`\``,
        prompt: (prd) => `Analyze the following PRD and generate a complete ERD in DBML notation.\n\nPRD Content:\n${prd}`,
    },

    'sql': {
        system: `You are an expert database engineer. Generate production-ready SQL DDL scripts.
Output TWO versions: MySQL and SQL Server. Include tables, columns, primary keys, foreign keys, indexes, constraints.`,
        prompt: (prd, erdContent) => {
            let p = `Generate complete SQL DDL scripts from the following requirements.`;
            if (erdContent) p += `\n\nERD (DBML):\n${erdContent}`;
            p += `\n\nPRD Content:\n${prd}`;
            return p;
        },
    },

    'flowchart': {
        system: `You are an expert BSA creating process flowcharts using Mermaid syntax.
Output inside a Mermaid code block. Use clear labels, decision nodes, parallel processes, error flows.`,
        prompt: (prd) => `Analyze the following PRD and generate comprehensive process flowcharts using Mermaid syntax.\n\nPRD Content:\n${prd}`,
    },

    'sequence-diagram': {
        system: `You are an expert BSA creating sequence diagrams using PlantUML syntax.
Include all actors, participants, messages, return values, alt/opt/loop fragments.`,
        prompt: (prd) => `Analyze the following PRD and generate detailed sequence diagrams using PlantUML syntax.\n\nPRD Content:\n${prd}`,
    },

    'use-case-diagram': {
        system: `You are an expert BSA creating use case diagrams using PlantUML syntax.
Include all actors, use cases, relationships (include, extend, generalize), and system boundaries.`,
        prompt: (prd) => `Analyze the following PRD and generate a comprehensive use case diagram using PlantUML syntax.\n\nPRD Content:\n${prd}`,
    },

    'activity-diagram': {
        system: `You are an expert BSA creating activity diagrams using Mermaid syntax.
Model workflow with activities, decisions, forks/joins for parallel processing, swim lanes.`,
        prompt: (prd) => `Analyze the following PRD and generate detailed activity diagrams using Mermaid syntax.\n\nPRD Content:\n${prd}`,
    },

    'screen-description': {
        system: `You are an expert BSA creating Screen Descriptions.
Output structured markdown: Overview, Fields table, Action Buttons table.
Data types: Text, Number, Password, Select, Toggle, Display, List, Date, Image.`,
        prompt: (prd, ctx) => {
            let p = `Analyze the following requirements and generate comprehensive Screen Descriptions.\n\nRequirements:\n${prd}`;
            if (ctx) p += `\n\nAdditional Context:\n${ctx}`;
            return p;
        },
    },

    'prototype': {
        system: `You are an expert frontend developer and Business Systems Analyst creating interactive UI prototypes that PRECISELY reflect a Product Requirements Document (PRD).

You MUST output ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "files": {
    "src/App.tsx": "<file content>",
    "src/components/ComponentName.tsx": "<file content>",
    "src/data/mockData.ts": "<file content>"
  }
}

CRITICAL — PRD Analysis Process:
1. READ the PRD thoroughly. Extract: project name, target users, core features, entities/data models, user flows.
2. MAP each feature in the PRD to a distinct screen/page in the prototype.
3. GENERATE mock data that uses the exact entity names, field names, and relationships from the PRD.
4. BUILD navigation that mirrors the PRD's module/feature structure.
5. DESIGN the UI to demonstrate each user story or functional requirement described in the PRD.

Code Rules:
- Use React + TypeScript.
- Tailwind CSS classes (CDN already loaded in index.html) for ALL styling. Do NOT import any CSS framework or component library.
- react-router-dom for multi-page navigation matching PRD feature areas.
- Create realistic mock data in src/data/mockData.ts that reflects the PRD's domain (use entity names, field names, enums from the PRD).
- Every screen must have: header with project name, sidebar/nav with all feature areas, main content area with realistic data.
- Include interactive elements: search, filters, forms, modals, status badges, CRUD actions.
- Use modern UI patterns: cards, tables, stats dashboards, empty states.
- Make the UI responsive (mobile + desktop).
- Write clean TypeScript that compiles without errors.
- Keep total output under 12000 tokens.

ALLOWED PACKAGES (these are the ONLY packages installed):
- react, react-dom, react-router-dom, lucide-react, recharts

FORBIDDEN — DO NOT import any of these (they are NOT installed and will crash the build):
- antd, @ant-design/*, @mui/*, @chakra-ui/*, @mantine/*, @headlessui/*, framer-motion, styled-components, @emotion/*, bootstrap, semantic-ui-react
- Build ALL UI components yourself using Tailwind CSS classes. No external component libraries.`,
        prompt: (prd, ctx) => {
            let p = `IMPORTANT: You must analyze the PRD below and create a prototype that DIRECTLY represents the features and data described in it. Do NOT generate a generic app — every screen, every piece of mock data, and every navigation item must come from the PRD.

=== PRD CONTENT (analyze this carefully) ===
${prd}
=== END PRD ===`;
            if (ctx) p += `\n\n=== ADDITIONAL CONTEXT (Figma/Design notes) ===\n${ctx}\n=== END CONTEXT ===`;
            p += `\n\nNow generate the prototype JSON. Remember:
1. Extract the project name, features, entities, and user roles from the PRD above.
2. Create screens for each feature area mentioned in the PRD.
3. Use the exact entity names and fields from the PRD for mock data.
4. Output ONLY the JSON object, no markdown wrapping.`;
            return p;
        },
    },
};

export const ARTIFACT_TYPE_OPTIONS: { value: ArtifactType; label: string }[] = [
    { value: 'user-story', label: 'User Stories' },
    { value: 'function-list', label: 'Function List' },
    { value: 'srs', label: 'SRS' },
    { value: 'erd', label: 'ERD (DBML)' },
    { value: 'screen-description', label: 'Screen Description' },
    { value: 'use-case-diagram', label: 'Use Case Diagram' },
    { value: 'sequence-diagram', label: 'Sequence Diagram' },
    { value: 'flowchart', label: 'Flowchart' },
    { value: 'sql', label: 'SQL' },
    { value: 'activity-diagram', label: 'Activity Diagram' },
    { value: 'prototype', label: '🖥 Prototype' },
];
