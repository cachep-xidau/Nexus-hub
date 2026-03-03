import { BookOpen, Rocket, Target, PenTool, FileText, Lightbulb, BarChart3, Code2, Palette, Shield, Zap, Users, Globe, Layers } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { KnowledgeDomain } from '../../lib/knowledge-db';

const ICON_MAP: Record<string, typeof BookOpen> = {
  Rocket,
  Target,
  PenTool,
  FileText,
  BookOpen,
  Lightbulb,
  BarChart3,
  Code2,
  Palette,
  Shield,
  Zap,
  Users,
  Globe,
  Layers,
};

const DOMAIN_COLORS: Record<string, { hex: string; rgb: string }> = {
  Rocket: { hex: '#F97316', rgb: '249, 115, 22' },
  Target: { hex: '#EF4444', rgb: '239, 68, 68' },
  PenTool: { hex: '#8B5CF6', rgb: '139, 92, 246' },
  FileText: { hex: '#06B6D4', rgb: '6, 182, 212' },
  Lightbulb: { hex: '#F59E0B', rgb: '245, 158, 11' },
  BarChart3: { hex: '#3B82F6', rgb: '59, 130, 246' },
  Code2: { hex: '#10B981', rgb: '16, 185, 129' },
  Palette: { hex: '#EC4899', rgb: '236, 72, 153' },
  Shield: { hex: '#3B82F6', rgb: '59, 130, 246' },
  Zap: { hex: '#FBBF24', rgb: '251, 191, 36' },
  Users: { hex: '#14B8A6', rgb: '20, 184, 166' },
  Globe: { hex: '#0EA5E9', rgb: '14, 165, 233' },
  Layers: { hex: '#A855F7', rgb: '168, 85, 247' },
  BookOpen: { hex: '#3B82F6', rgb: '59, 130, 246' },
};

function DomainIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] || BookOpen;
  return <Icon size={size} />;
}

export function DomainCards({
  domains,
  onSelect,
}: {
  domains: KnowledgeDomain[];
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="knowledge-domain-grid">
      {domains.map(domain => {
        const domainColor = DOMAIN_COLORS[domain.icon] || DOMAIN_COLORS.BookOpen;
        return (
          <button
            key={domain.id}
            className="knowledge-domain-card"
            onClick={() => onSelect(domain.slug)}
            aria-label={`${domain.name} — ${domain.article_count || 0} bài viết`}
            data-testid={`domain-card-${domain.slug}`}
            style={{ '--domain-color': domainColor.hex, '--domain-color-rgb': domainColor.rgb } as CSSProperties}
          >
            <div className="knowledge-domain-card-icon">
              <DomainIcon name={domain.icon} size={24} />
            </div>
            <h3>{domain.name}</h3>
            <p>{domain.description}</p>
            <span className="knowledge-domain-badge">{domain.article_count || 0} bài viết</span>
          </button>
        );
      })}
    </div>
  );
}
