import { useState, useEffect } from 'react';
import {
    BookOpen, X, FileText, Sparkles, Plug, MessageSquare, Search,
    ArrowRight, Lightbulb,
} from 'lucide-react';

// ── Guide Content Data ──────────────────────────────
type GuideKey = 'prd' | 'generate' | 'connect' | 'chat' | 'analysis';

interface GuideStep { emoji: string; heading: string; body: string; }
interface GuideData {
    title: string;
    icon: typeof FileText;
    intro: string;
    steps: GuideStep[];
    tip?: string;
    ctaLabel: string;
    ctaTab?: string;
}

const GUIDE_CONTENT: Record<GuideKey, GuideData> = {
    prd: {
        title: 'Tạo PRD đầu tiên',
        icon: FileText,
        intro: 'PRD (Product Requirements Document) là tài liệu mô tả yêu cầu sản phẩm. Nexus Hub sử dụng PRD làm nguồn đầu vào để sinh ra các artifacts chất lượng.',
        steps: [
            { emoji: '📋', heading: 'Chuẩn bị PRD', body: 'Copy nội dung PRD từ Google Docs, Confluence, Notion hoặc bất kỳ nguồn nào. Hỗ trợ plain text và Markdown.' },
            { emoji: '📝', heading: 'Paste hoặc Upload', body: 'Chuyển sang tab PRD → paste nội dung vào editor hoặc upload file .txt/.md. Nhấn Save để lưu.' },
            { emoji: '🤖', heading: 'Hoặc dùng AI Chat', body: 'Click nút "AI Chat" trên tab PRD → AI sẽ hướng dẫn bạn qua 6 bước tạo PRD theo phương pháp BMAD.' },
        ],
        tip: 'Sử dụng Markdown (## headings, - bullet points) để AI phân tích chính xác hơn.',
        ctaLabel: 'Mở PRD Editor →',
        ctaTab: 'prd',
    },
    generate: {
        title: 'Generate Artifacts',
        icon: Sparkles,
        intro: 'Từ PRD, Nexus Hub sinh ra 10 loại tài liệu kỹ thuật: User Stories, Function List, SRS, ERD, SQL, Flowchart, Sequence Diagram, và thêm nữa.',
        steps: [
            { emoji: '🏗️', heading: 'Tạo Features & Functions', body: 'Vào tab Artifacts → tạo Feature groups (module lớn) → thêm Functions (chức năng cụ thể) bên trong mỗi Feature.' },
            { emoji: '🎯', heading: 'Chọn loại Artifact', body: 'Click "Generate Artifacts" → chọn Feature/Function scope → tick các loại artifact muốn tạo (1-10 loại).' },
            { emoji: '⚡', heading: 'AI sinh artifact', body: 'Pipeline chạy tuần tự — ERD tự động truyền context cho SQL. Progress bar hiển thị tiến trình real-time.' },
            { emoji: '🔍', heading: 'Review kết quả', body: 'Xem artifacts trong Artifact Panel. Hỗ trợ 2 chế độ: Preview (formatted) và Raw (source markdown). Re-generate nếu cần.' },
        ],
        ctaLabel: 'Bắt đầu tạo Artifacts →',
        ctaTab: 'artifacts',
    },
    connect: {
        title: 'Kết nối Data Sources',
        icon: Plug,
        intro: 'Kết nối các nguồn dữ liệu bên ngoài để bổ sung context cho quá trình phân tích: Confluence, Figma, Notion, hoặc Web URLs.',
        steps: [
            { emoji: '🔑', heading: 'Chuẩn bị credentials', body: 'Lấy API token từ Figma (Personal Access Token), Confluence (API token), hoặc Notion (Integration token).' },
            { emoji: '🔗', heading: 'Thêm connection', body: 'Vào tab Connections → "Add Connection" → chọn loại → nhập URL và API token → Create.' },
            { emoji: '✅', heading: 'Xác minh kết nối', body: 'Sau khi tạo, toggle status sang "Connected". Dữ liệu credentials lưu local an toàn.' },
        ],
        tip: 'Tất cả dữ liệu lưu hoàn toàn local — không gửi lên cloud.',
        ctaLabel: 'Mở Connections →',
        ctaTab: 'connections',
    },
    chat: {
        title: 'Chat với AI về PRD',
        icon: MessageSquare,
        intro: 'Sử dụng PRD Chat để tạo hoặc chỉnh sửa PRD với AI theo phương pháp BMAD 6 bước.',
        steps: [
            { emoji: '💬', heading: 'Mở PRD Chat', body: 'Tab PRD → click "AI Chat" → panel chat mở từ bên phải. AI sẽ hướng dẫn theo 6 sections.' },
            { emoji: '📝', heading: '6 bước BMAD', body: 'Executive Summary → Success Criteria → User Journeys → Functional Requirements → Non-Functional Requirements → Polish.' },
            { emoji: '📄', heading: 'Compile & Save', body: 'Sau khi hoàn tất, AI tổng hợp conversation thành PRD markdown → lưu vào project.' },
        ],
        ctaLabel: 'Mở PRD Tab →',
        ctaTab: 'prd',
    },
    analysis: {
        title: 'Phân tích & Nghiên cứu',
        icon: Search,
        intro: '5 loại phân tích BMAD giúp bạn nghiên cứu sâu hơn: Brainstorming, Market, Domain, Technical, và Product Brief.',
        steps: [
            { emoji: '🧠', heading: 'Chọn loại phân tích', body: 'Tab Analysis → click vào card phân tích phù hợp: Brainstorming cho ý tưởng, Market cho thị trường, Domain cho lĩnh vực...' },
            { emoji: '💡', heading: 'Chat tự do', body: 'Mỗi loại có AI system prompt chuyên biệt. Chat không giới hạn bước — AI đóng vai Facilitator hỗ trợ bạn.' },
            { emoji: '💾', heading: 'Compile & Save', body: 'Click "Compile & Save" để AI tổng hợp thành report → lưu vào danh sách documents. Xem lại bất kỳ lúc nào.' },
        ],
        tip: 'Documents đã save có thể preview và xóa từ Analysis tab.',
        ctaLabel: 'Mở Analysis →',
        ctaTab: 'analysis',
    },
};

// ── Guide Cards + Slider (reusable) ──────────────────
interface GuideSectionProps {
    projectId: string;
    hasPrd: boolean;
    hasFeatures: boolean;
    hasArtifacts: boolean;
    hasConnections: boolean;
    onNavigateTab: (tab: string) => void;
}

export function GuideSection({ projectId, hasPrd, hasFeatures, hasArtifacts, hasConnections, onNavigateTab }: GuideSectionProps) {
    const [dismissed, setDismissed] = useState(false);
    const [selectedGuide, setSelectedGuide] = useState<GuideKey | null>(null);
    const hidden = dismissed || localStorage.getItem(`guide-hidden-${projectId}`) === 'true';

    // Escape key closes slider
    useEffect(() => {
        if (!selectedGuide) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedGuide(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedGuide]);

    const handleDismiss = () => {
        localStorage.setItem(`guide-hidden-${projectId}`, 'true');
        setDismissed(true);
    };

    if (hidden) return null;

    const guideCards: { key: GuideKey; icon: typeof FileText; title: string; desc: string; done: boolean }[] = [
        { key: 'prd', icon: FileText, title: 'Tạo PRD đầu tiên', desc: 'Dán hoặc tạo PRD để bắt đầu', done: hasPrd },
        { key: 'generate', icon: Sparkles, title: 'Generate Artifacts', desc: 'Tạo User Stories, SRS, ERD...', done: hasArtifacts },
        { key: 'connect', icon: Plug, title: 'Kết nối Data Sources', desc: 'Figma, Confluence, Notion', done: hasConnections },
        { key: 'chat', icon: MessageSquare, title: 'Chat AI về PRD', desc: 'Tạo/chỉnh sửa PRD với AI', done: false },
        { key: 'analysis', icon: Search, title: 'Phân tích & Nghiên cứu', desc: '5 loại Analysis BMAD', done: hasFeatures },
    ];

    const completedCount = guideCards.filter(c => c.done).length;

    return (
        <>
            {/* Guide Cards Grid */}
            <div className="guide-section">
                <div className="guide-header">
                    <div className="guide-header-left">
                        <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                        <span className="guide-title">Hướng dẫn sử dụng</span>
                        <span className="guide-progress">{completedCount}/{guideCards.length}</span>
                    </div>
                    <button className="icon-btn-subtle" onClick={handleDismiss} title="Ẩn hướng dẫn">
                        <X size={16} />
                    </button>
                </div>

                <div className="guide-cards-grid">
                    {guideCards.map(card => {
                        const Icon = card.icon;
                        return (
                            <button key={card.key} className={`guide-card ${card.done ? 'done' : ''}`}
                                onClick={() => setSelectedGuide(card.key)}>
                                <div className="guide-card-top">
                                    <div className="guide-card-icon">
                                        <Icon size={18} />
                                    </div>
                                    {card.done && <span className="guide-done-badge">✓</span>}
                                </div>
                                <div className="guide-card-title">{card.title}</div>
                                <div className="guide-card-desc">{card.desc}</div>
                                <div className="guide-card-action">
                                    Xem hướng dẫn <ArrowRight size={12} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Guide Slider Overlay */}
            {selectedGuide && GUIDE_CONTENT[selectedGuide] && (() => {
                const guide = GUIDE_CONTENT[selectedGuide];
                const Icon = guide.icon;
                return (
                    <div className="guide-slider-overlay" onClick={() => setSelectedGuide(null)}>
                        <div className="guide-slider-panel" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="guide-slider-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="guide-slider-icon"><Icon size={18} /></div>
                                    <div>
                                        <div className="guide-slider-title">{guide.title}</div>
                                        <div className="guide-slider-subtitle">Hướng dẫn sử dụng</div>
                                    </div>
                                </div>
                                <button className="icon-btn-subtle" onClick={() => setSelectedGuide(null)}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="guide-slider-content">
                                <p className="guide-slider-intro">{guide.intro}</p>

                                <div className="guide-slider-steps">
                                    {guide.steps.map((step, i) => (
                                        <div key={i} className="guide-step-card">
                                            <div className="guide-step-header">
                                                <span className="guide-step-emoji">{step.emoji}</span>
                                                <span className="guide-step-heading">Bước {i + 1}: {step.heading}</span>
                                            </div>
                                            <p className="guide-step-body">{step.body}</p>
                                        </div>
                                    ))}
                                </div>

                                {guide.tip && (
                                    <div className="guide-tip">
                                        <Lightbulb size={14} />
                                        <span><strong>Tip:</strong> {guide.tip}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer CTA */}
                            <div className="guide-slider-footer">
                                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={() => {
                                        setSelectedGuide(null);
                                        if (guide.ctaTab) onNavigateTab(guide.ctaTab);
                                    }}>
                                    {guide.ctaLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
