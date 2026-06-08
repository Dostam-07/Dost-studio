import { ollamaService } from './ollama';
import type { EnhancedPrompt, PRD, Architecture, GenerationProgress, ProjectFile } from '@/types';
import { v4 as uuid } from 'uuid';
import { codeValidator } from './codeValidator';

const SYSTEM_PROMPTS: Record<string, string> = {
  planner: `You are an expert Product Manager and Product Strategist. Your role is to:
1. Analyze user requirements deeply
2. Generate comprehensive PRDs
3. Define user personas, stories, and features
4. Think about edge cases, success metrics, and risks
5. Output structured, actionable product blueprints

Always think deeply about the problem before responding. Consider the user's true needs, not just their words.`,

  architect: `You are an expert Software Architect and UX Designer. Your role is to:
1. Design scalable architecture
2. Plan folder structures
3. Define routes, components, and state management
4. Design database schemas
5. Create API endpoints
6. Consider responsive design and UX best practices

Always provide practical, implementable architectures. Use React + TypeScript + TailwindCSS patterns.

When defining the app, always include a src/App.tsx with BrowserRouter, Routes, and Route entries for each page. Output route structure in React Router v6 syntax using Link and useNavigate where appropriate.`,

  coder: `You are an expert Senior Software Engineer generating complete production-ready React + TypeScript + TailwindCSS components.

STRICT RULES — violating any of these will break the build:
1. NEVER import from 'shadcn/ui', '@/components/ui', 'radix-ui', '@radix-ui', or any external UI library
2. EVERY file MUST have a default export: export default function ComponentName() {}
3. Use ONLY plain TailwindCSS utility classes for all styling — no inline style objects except for dynamic values
4. Use ONLY these imports: react, react-router-dom, recharts, lucide-react (for icons only)
5. All TypeScript interfaces must be defined inline in the same file
6. No placeholder implementations — write complete working code
7. For forms: use controlled inputs with useState
8. For navigation: use react-router-dom Link and useNavigate
9. Generate realistic mock data — no "Lorem ipsum", no "Item 1, Item 2"
10. Every page must have a visual header, meaningful content, and proper spacing

When generating multiple files, output each as:
FILE: src/path/to/File.tsx
\`\`\`tsx
[complete file content]
\`\`\`
`,
};

let promptOverrides: Record<string, string> = {};

export function setPromptOverrides(overrides: Record<string, string | undefined>) {
  promptOverrides = {};
  for (const [key, val] of Object.entries(overrides)) {
    if (val && val.trim()) promptOverrides[key] = val.trim();
  }
}

export function getSystemPrompt(key: string): string {
  return promptOverrides[key] || SYSTEM_PROMPTS[key] || '';
}

export interface EnhancerStyle {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  systemPrompt: string;
}

export const ENHANCER_STYLES: EnhancerStyle[] = [
  {
    id: 'balanced',
    name: 'Balanced Strategist',
    icon: '✦',
    color: 'text-primary',
    description: 'Comprehensive product brief covering all aspects',
    systemPrompt: `You are an expert Product Strategist. Your role is to take a user's initial prompt and dramatically expand it into a comprehensive product brief.

Analyze the prompt deeply and generate:
- Product Vision: What is the core vision
- Target Users: Who will use this
- Personas: Detailed user personas
- Core Features: What features are needed
- User Stories: How users will interact
- Pages: What pages are needed
- User Flows: Key user journeys
- Architecture: Technical approach
- Database: Data model considerations
- UX Requirements: Design requirements
- Technical Requirements: Tech constraints
- Edge Cases: What could go wrong
- Acceptance Criteria: What defines done
- Success Metrics: How to measure success
- Risks: What might fail

Be thorough and specific. Think about what would make this product successful.`,
  },
  {
    id: 'technical',
    name: 'Technical Architect',
    icon: '⚙',
    color: 'text-sky-400',
    description: 'Deep focus on architecture, stack, APIs, and data model',
    systemPrompt: `You are an expert Software Architect. Your role is to take a user's initial prompt and expand it into a deep technical product brief.

Focus your analysis on:
- System Architecture: Scalable design patterns, microservices vs monolith
- Tech Stack: Specific frameworks, databases, infrastructure choices
- API Design: REST/GraphQL endpoints, webhooks, integrations
- Data Model: Schema design, relationships, indexing strategy
- Performance: Caching, CDN, database optimization
- Deployment: CI/CD, hosting, containerization
- Security Architecture: Auth flows, encryption, data isolation
- Third-Party Integrations: Payment, email, analytics services
- Technical Debt Prevention: Code quality, testing strategy, monitoring

Be specific with technologies and architectural decisions. Recommend concrete solutions.`,
  },
  {
    id: 'ux',
    name: 'UX Visionary',
    icon: '◉',
    color: 'text-amber-400',
    description: 'User experience, design system, accessibility focus',
    systemPrompt: `You are an expert UX Designer and Design Strategist. Your role is to take a user's initial prompt and expand it into a comprehensive experience design brief.

Focus your analysis on:
- User Journey: End-to-end experience map with touchpoints
- Design System: Component hierarchy, typography, color system
- Accessibility: WCAG compliance, screen reader support, keyboard nav
- Interaction Design: Animations, transitions, micro-interactions
- Responsive Design: Mobile, tablet, desktop breakpoints
- Information Architecture: Navigation structure, content hierarchy
- Onboarding: First-run experience, tutorial flow
- Emotional Design: Personality, tone of voice, delight moments
- Error States: Empty states, loading states, error recovery

Think deeply about how users feel at every step. Design for delight.`,
  },
  {
    id: 'growth',
    name: 'Growth Hacker',
    icon: '▲',
    color: 'text-emerald-400',
    description: 'Viral loops, monetization, retention, acquisition',
    systemPrompt: `You are an expert Growth Product Manager. Your role is to take a user's initial prompt and expand it into a growth-focused product brief.

Focus your analysis on:
- User Acquisition: Channels, viral mechanics, referral loops
- Monetization: Pricing tiers, freemium model, upsell triggers
- Retention: Engagement loops, habit formation, notifications
- Conversion Optimization: Funnel analysis, A/B testing strategy
- Network Effects: How the product gets better with more users
- Market Positioning: Competitive moat, differentiation strategy
- Go-to-Market: Launch strategy, initial user acquisition
- Analytics: Key growth metrics, cohort analysis, funnel tracking
- Scalability: How growth affects infrastructure and support

Think about how to turn one user into ten, then ten into ten thousand.`,
  },
  {
    id: 'mvp',
    name: 'Lean MVP',
    icon: '▸',
    color: 'text-orange-400',
    description: 'Minimum viable product, fast delivery, lean approach',
    systemPrompt: `You are an expert Lean Startup consultant. Your role is to take a user's initial prompt and distill it into the leanest possible MVP.

Focus your analysis on:
- Core Hypothesis: The single most important assumption to validate
- Absolute Minimum: What is the smallest possible feature set
- Build-Measure-Learn: What to build, how to measure, what to learn
- Time to Market: How to ship in days/weeks not months
- Riskiest Assumptions: What needs validation first
- Fake-it Stage: Can we simulate features before building them
- Pivot Triggers: When to change direction
- Resource Optimization: Do more with less
- Validation Metrics: How to know if the idea works

Be ruthless about cutting non-essential features. Every line of code must earn its place.`,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Scale',
    icon: '▦',
    color: 'text-indigo-400',
    description: 'Scalability, security, compliance, multi-tenant',
    systemPrompt: `You are an expert Enterprise Architect. Your role is to take a user's initial prompt and expand it into an enterprise-grade product brief.

Focus your analysis on:
- Multi-Tenancy: Data isolation, tenant configuration, white-labeling
- Compliance: SOC2, GDPR, HIPAA, PCI-DSS requirements
- Enterprise Security: SSO/SAML, RBAC, audit logging, data retention
- Scalability: Horizontal scaling, sharding, read replicas
- High Availability: Multi-region, failover, disaster recovery
- Integration: Enterprise APIs, webhooks, SFTP, ETL pipelines
- Admin Features: Tenant management, billing, usage analytics
- SLA Considerations: Uptime guarantees, rate limiting, throttling
- Migration Path: Data import, legacy system integration

Design for organizations with thousands of users and strict compliance needs.`,
  },
  {
    id: 'data',
    name: 'Data Driven',
    icon: '◈',
    color: 'text-violet-400',
    description: 'Analytics, metrics, experimentation, data pipelines',
    systemPrompt: `You are an expert Data Product Manager. Your role is to take a user's initial prompt and expand it into a data-centric product brief.

Focus your analysis on:
- Data Model: Events, entities, relationships, schemas
- Analytics Architecture: Tracking, warehouse, dashboards
- Key Metrics: North star, leading indicators, health metrics
- Experimentation: A/B testing framework, statistical significance
- Data Pipeline: Collection, processing, storage, visualization
- User Analytics: Cohorts, retention curves, funnel analysis
- Business Intelligence: Reports, alerts, automated insights
- Data Privacy: Anonymization, consent management, data retention
- ML Opportunities: Recommendation, prediction, personalization

Design the product so every feature generates learnings and every metric drives decisions.`,
  },
  {
    id: 'design-thinking',
    name: 'Design Thinker',
    icon: '◇',
    color: 'text-rose-400',
    description: 'Empathy, problem definition, prototyping, validation',
    systemPrompt: `You are an expert Design Thinking facilitator. Your role is to take a user's initial prompt and expand it through human-centered design.

Focus your analysis on:
- Problem Space: Deep definition of the real problem (not the requested solution)
- User Empathy: What users feel, fear, and desire
- Persona Depth: Goals, frustrations, context, environment
- Ideation: Multiple solution directions, divergent thinking
- Prototyping: Low-fidelity to high-fidelity validation plan
- User Testing: How to validate assumptions with real users
- Iteration: How feedback loops refine the solution
- Emotional Journey: User feelings at each interaction point
- Accessibility: Designing for diverse abilities and contexts

Put yourself in the user's shoes. Challenge assumptions. Define the problem before the solution.`,
  },
  {
    id: 'security',
    name: 'Security First',
    icon: '◐',
    color: 'text-cyan-400',
    description: 'Auth, encryption, threat modeling, privacy',
    systemPrompt: `You are an expert Security Engineer. Your role is to take a user's initial prompt and expand it into a security-hardened product brief.

Focus your analysis on:
- Authentication: MFA, OAuth, passwordless, session management
- Authorization: RBAC, ABAC, permission models, least privilege
- Data Protection: Encryption at rest and in transit, key management
- Threat Modeling: STRIDE analysis, attack surface, trust boundaries
- API Security: Rate limiting, input validation, CORS, CSRF
- Compliance: GDPR, CCPA, SOC2, HIPAA, data residency
- Audit: Logging, monitoring, alerting, forensics
- Secure Development: Dependency scanning, SAST/DAST, code review
- Incident Response: Breach detection, containment, recovery

Assume you're being attacked. Design defenses for the most sophisticated threats.`,
  },
  {
    id: 'mobile',
    name: 'Mobile Native',
    icon: '▭',
    color: 'text-teal-400',
    description: 'Responsive, touch, offline, PWA, mobile-first',
    systemPrompt: `You are an expert Mobile-First Product Designer. Your role is to take a user's initial prompt and expand it into a mobile-optimized product brief.

Focus your analysis on:
- Mobile-First Design: Start with the smallest screen, scale up
- Touch Interactions: Gestures, haptics, thumb zones, reachability
- Offline Mode: Local storage, sync strategy, conflict resolution
- Performance: Load time, bundle size, image optimization, CDN
- PWA Features: Service workers, manifest, push notifications
- Device Features: Camera, GPS, microphone, accelerometer
- Responsive Layout: Adaptive components, breakpoints, fluid typography
- Mobile UX: Bottom navigation, single-hand use, reducing friction
- Cross-Platform: iOS, Android, web consistency

Think about someone using this on a crowded train with one hand and spotty connection.`,
  },
];

export class AgentSystem {
  private progress: GenerationProgress[] = [];
  private onProgress?: (progress: GenerationProgress[]) => void;

  constructor(onProgress?: (progress: GenerationProgress[]) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(stage: string, status: 'pending' | 'in-progress' | 'completed' | 'error', message?: string) {
    const existing = this.progress.find((p) => p.stage === stage);
    if (existing) {
      existing.status = status;
      if (message) existing.message = message;
    } else {
      this.progress.push({ stage, status, message });
    }
    this.onProgress?.([...this.progress]);
  }

  async enhancePrompt(prompt: string, model: string, styleIndex: number = 0, attachmentContext?: string): Promise<EnhancedPrompt> {
    const style = ENHANCER_STYLES[styleIndex] || ENHANCER_STYLES[0];
    const promptWithAttachments = attachmentContext
      ? `${prompt}\n\nAttachments (images, Figma designs, reference files):\n${attachmentContext}`
      : prompt;
    const result = await ollamaService.generateJSON<EnhancedPrompt>(
      model,
      `User prompt: "${promptWithAttachments}"

Generate a comprehensive enhanced product brief. Return a JSON object with ALL of these fields:
- productVision: string
- targetUsers: string
- personas: string[] (at least 3)
- coreFeatures: string[] (at least 5)
- userStories: string[] (at least 5)
- pages: string[] (at least 4)
- userFlows: string[] (at least 3)
- architecture: string
- database: string
- uxRequirements: string[] (at least 3)
- technicalRequirements: string[] (at least 3)
- edgeCases: string[] (at least 3)
- acceptanceCriteria: string[] (at least 3)
- successMetrics: string[] (at least 3)
- risks: string[] (at least 3)`,
      style.systemPrompt
    );

    return result;
  }

  async generatePRD(enhancedPrompt: EnhancedPrompt, model: string, additionalContext?: string): Promise<PRD> {
    this.updateProgress('PRD Generation', 'in-progress', 'Creating product requirements document...');

    const contextSection = additionalContext
      ? `\n\nAdditional context (attached images, Figma designs, reference files):\n${additionalContext}\n\nUse this design context to inform the PRD's visual direction, layout decisions, and component hierarchy.`
      : '';

    const result = await ollamaService.generateJSON<PRD>(
      model,
      `Based on this product brief, generate a comprehensive PRD:

Vision: ${enhancedPrompt.productVision}
Target Users: ${enhancedPrompt.targetUsers}
Personas: ${enhancedPrompt.personas.join(', ')}
Core Features: ${enhancedPrompt.coreFeatures.join(', ')}
User Stories: ${enhancedPrompt.userStories.join(', ')}
Pages: ${enhancedPrompt.pages.join(', ')}
User Flows: ${enhancedPrompt.userFlows.join(', ')}${contextSection}

Generate a PRD with:
- title: string
- overview: string
- goals: string[]
- targetAudience: string
- userPersonas: array of { name, role, goals: string[], painPoints: string[], behaviors: string[] }
- features: array of { id, name, description, priority: "critical"|"high"|"medium"|"low", status: "planned", dependencies: string[] }
- userStories: array of { id, title, description, feature, acceptanceCriteria: string[], priority }
- pages: string[]
- technicalStack: string
- constraints: string[]
- successMetrics: string[]
- timeline: string`,
      getSystemPrompt('planner')
    );

    this.updateProgress('PRD Generation', 'completed', 'PRD created successfully');
    return result;
  }

  async generateArchitecture(prd: PRD, model: string): Promise<Architecture> {
    this.updateProgress('Architecture Design', 'in-progress', 'Designing system architecture...');

    const result = await ollamaService.generateJSON<Architecture>(
      model,
      `Based on this PRD, design the complete architecture:

Title: ${prd.title}
Features: ${prd.features.map((f) => f.name).join(', ')}
Pages: ${prd.pages.join(', ')}
User Stories: ${prd.userStories.map((u) => u.title).join(', ')}
Technical Stack: ${prd.technicalStack}

Generate architecture with:
- framework: "React + TypeScript + Vite + TailwindCSS"
- folderStructure: array of { path, type: "file"|"folder" }
- routes: array of { path, component, description, auth: boolean }
- components: array of { id, name, description, filePath, props: string[], dependencies: string[], routes: string[] }
- stateManagement: "Zustand"
- database: { tables: array of { name, columns: array of { name, type, primary?, foreign?, required?, default? }, indexes: string[] }, relationships: array of { from, to, type } }
- apiEndpoints: array of { method, path, description, auth, requestBody?, responseType? }

Use React + TypeScript + Vite + TailwindCSS + Zustand + React Router. No external UI libraries — plain TailwindCSS only.`,
      getSystemPrompt('architect')
    );

    this.updateProgress('Architecture Design', 'completed', 'Architecture designed successfully');
    return result;
  }

  async generateFiles(
    prd: PRD,
    architecture: Architecture,
    model: string,
    onFileGenerated?: (file: ProjectFile) => void
  ): Promise<ProjectFile[]> {
    this.updateProgress('Code Generation', 'in-progress', 'Generating project files...');

    const files: ProjectFile[] = [];

    const clean = (raw: string, ext: string): string => {
      // Strip markdown code fences: ```tsx ... ```, ```typescript ... ```, ```html ... ```, or plain ``` ... ```
      const cleaned = raw.replace(/```\w*\s*[\r\n]/g, '').replace(/```\s*$/gm, '').trim();
      return cleaned;
    };

    const generateWithRetry = async (path: string, prompt: string, maxRetries = 2): Promise<string> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const actualPrompt = attempt === 0
          ? prompt
          : `${prompt}\n\nPrevious attempt had syntax errors. Fix ALL of these issues:\n${lastError}\n`;
        const raw = await ollamaService.generate(model, actualPrompt, getSystemPrompt('coder'));
        const code = clean(raw, 'tsx');
        if (code.includes('export default') || code.includes('export { default }')) {
          const result = codeValidator.validate(code, path);
          if (result.valid || attempt >= maxRetries) {
            if (result.fixed && result.content) return result.content;
            return code;
          }
          lastError = result.errors.join('; ');
          console.log(`[Retry ${attempt + 1}/${maxRetries}] ${path}: ${lastError}`);
        } else {
          lastError = 'Missing default export';
          if (attempt < maxRetries) console.log(`[Retry ${attempt + 1}/${maxRetries}] ${path}: ${lastError}`);
          else return code;
        }
      }
      return '';
    };
    let lastError = '';

    // Generate based on architecture components
    const totalComponents = architecture.components.length;
    for (let i = 0; i < totalComponents; i++) {
      const component = architecture.components[i];
      const progress = Math.round(((i + 1) / totalComponents) * 100);
      this.updateProgress('Code Generation', 'in-progress', `Generating ${component.name} (${progress}%)...`);

      const code = await generateWithRetry(
        component.filePath,
        `Generate a complete React + TypeScript component file.

Component: ${component.name}
Description: ${component.description}
Props: ${component.props.join(', ') || 'none'}
Dependencies: ${component.dependencies.join(', ') || 'none'}
Routes: ${component.routes.join(', ') || 'none'}
File Path: ${component.filePath}

Generate complete, production-ready code. Use proper TypeScript types. Include TailwindCSS styling (plain classes only — NO shadcn/ui, NO @/components/ui imports). The component MUST have a default export.`
      );

      files.push({
        path: component.filePath,
        content: code,
        language: 'typescript',
        type: 'generated',
      });
      onFileGenerated?.(files[files.length - 1]);

      // Generate test file for this component
      const testContent = `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ${component.name} from './${component.name}';

describe('${component.name}', () => {
  it('renders without crashing', () => {
    const { container } = render(<${component.name} />);
    expect(container).toBeTruthy();
  });

  it('renders component', () => {
    render(<${component.name} />);
    expect(screen.getByText(/${component.description.split(' ')[0]}/i)).toBeTruthy();
  });
});
`;
      if (!files.some((f) => f.path === component.filePath.replace(/\.tsx$/, '.test.tsx'))) {
        files.push({
          path: component.filePath.replace(/\.tsx$/, '.test.tsx'),
          content: testContent,
          language: 'typescript',
          type: 'generated',
        });
      }
    }

    // Generate route files
    for (const route of architecture.routes) {
      const routePath = `src/pages/${route.component}.tsx`;
      if (files.some((f) => f.path === routePath)) continue;

      const code = await generateWithRetry(
        routePath,
        `Generate a page component for route "${route.path}".
Route component name: ${route.component}
Description: ${route.description}

Generate a complete React + TypeScript page component using plain TailwindCSS only (NO shadcn/ui imports). The component MUST have a default export.`
      );

      files.push({
        path: routePath,
        content: code,
        language: 'typescript',
        type: 'generated',
      });
      onFileGenerated?.(files[files.length - 1]);

      // Generate test file for this route
      const routeTestContent = `import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ${route.component} from './${route.component}';

describe('${route.component}', () => {
  it('renders without crashing', () => {
    const { container } = render(<${route.component} />);
    expect(container).toBeTruthy();
  });
});
`;
      const routeTestPath = routePath.replace(/\.tsx$/, '.test.tsx');
      if (!files.some((f) => f.path === routeTestPath)) {
        files.push({
          path: routeTestPath,
          content: routeTestContent,
          language: 'typescript',
          type: 'generated',
        });
      }
    }

    // Generate index.html entry point (standalone demo page)
    this.updateProgress('Code Generation', 'in-progress', 'Generating preview entry page...');
    const htmlRaw = await ollamaService.generate(
      model,
      `Generate a complete, self-contained HTML5 page that serves as a visual preview/demo of the following product.

Product: ${prd.title}
Description: ${prd.overview}
Theme/Style: Modern, clean, use TailwindCSS via CDN (script src="https://cdn.tailwindcss.com")

Requirements:
1. Single HTML file with everything inline (no React build needed)
2. Use TailwindCSS CDN for styling
3. Show the main UI of the product as a static HTML/CSS demo
4. Include realistic sample data and content
5. Make it visually impressive with proper layout, spacing, colors
6. Include a header, main content area, and footer
7. Use Font Awesome or Heroicons CDN for icons if needed
8. Do NOT use React or JSX — plain HTML + Tailwind only
9. Make it responsive and mobile-friendly

This page is a quick preview to show what the product looks like. Make it beautiful and representative of the full product.`,
      getSystemPrompt('coder')
    );

    const htmlCode = clean(htmlRaw, 'html');
    files.push({
      path: 'index.html',
      content: htmlCode,
      language: 'html',
      type: 'generated',
    });
    onFileGenerated?.(files[files.length - 1]);

    // Generate Layout.tsx with nav links for all routes
    const navItems = architecture.routes.map((r) => {
      const name = r.component.replace(/([A-Z])/g, ' $1').trim();
      return `  { path: '${r.path || '/'}', name: '${name}' }`;
    }).join(',\n');

    const layoutContent = `import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
${navItems}
];

export default function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-gray-900">App</span>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={location.pathname === item.path
                      ? 'px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700'
                      : 'px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={location.pathname === item.path
                  ? 'block px-3 py-2 rounded-lg text-sm font-medium bg-indigo-100 text-indigo-700'
                  : 'block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100'
                }
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
`;
    files.push({
      path: 'src/components/Layout.tsx',
      content: layoutContent,
      language: 'typescript',
      type: 'generated',
    });
    onFileGenerated?.(files[files.length - 1]);

    // Validate and auto-fix generated code
    for (const file of files) {
      if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
        const result = codeValidator.validate(file.content, file.path);
        if (result.fixed && result.content) {
          file.content = result.content;
        }
        if (result.errors.length > 0 || result.warnings.length > 0) {
          console.log(`[CodeValidator] ${file.path}:`, result.errors, result.warnings);
        }
      }
    }

    this.updateProgress('Code Generation', 'completed', `Generated ${files.length} files`);
    return files;
  }

  async generateAll(
    prompt: string,
    models: { planner: string; architect: string; coder: string },
    onProgress?: (progress: GenerationProgress[]) => void,
    onFileGenerated?: (file: ProjectFile) => void,
    existingEnhanced?: EnhancedPrompt
  ): Promise<{ enhancedPrompt: EnhancedPrompt; prd: PRD; architecture: Architecture; files: ProjectFile[] }> {
    this.progress = [];
    this.onProgress = onProgress;

    try {
      let enhancedPrompt: EnhancedPrompt;
      let attachmentContext: string | undefined;
      if (existingEnhanced) {
        enhancedPrompt = existingEnhanced;
        // Extract attachment blocks from the original enriched prompt so they feed into PRD → Architecture → Files
        const match = prompt.match(/--- .*?--- end .*?(?=\n---|\n*$)/g);
        if (match) {
          attachmentContext = match.join('\n');
        }
      } else {
        enhancedPrompt = await this.enhancePrompt(prompt, models.planner);
      }

      const prd = await this.generatePRD(enhancedPrompt, models.planner, attachmentContext);

      const architecture = await this.generateArchitecture(prd, models.architect);

      const files = await this.generateFiles(prd, architecture, models.coder, onFileGenerated);

      return { enhancedPrompt, prd, architecture, files };
    } catch (error) {
      this.updateProgress('Error', 'error', (error as Error).message);
      throw error;
    }
  }

  async chatWithProject(
    message: string,
    model: string,
    projectContext: string,
    stream?: (chunk: string) => void
  ): Promise<string> {
    const system = `You are Dost Studio's AI Product Engineer and Technical Co-Founder. You have deep understanding of the user's project.

Project Context:
${projectContext}

Your role is to:
1. Answer questions about the project using the context
2. Suggest improvements based on project understanding
3. Help debug issues by understanding component relationships
4. Propose features that align with product vision
5. Analyze impact of changes using dependency knowledge

Be thoughtful, specific, and actionable. Reference specific files, components, and routes when relevant.`;

    return ollamaService.chat(model, [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ], stream);
  }

  /**
   * Detects whether the user's message is a code-change request or a Q&A question.
   * Returns 'edit' for anything that implies a change to the project,
   * 'chat' for questions and discussions.
   */
  detectIntent(message: string): 'edit' | 'chat' {
    const editKeywords = [
      'add', 'create', 'make', 'build', 'implement', 'generate', 'write',
      'change', 'update', 'modify', 'edit', 'refactor', 'rename', 'move',
      'fix', 'debug', 'solve', 'resolve', 'patch',
      'remove', 'delete', 'clean', 'simplify',
      'style', 'design', 'color', 'font', 'layout',
      'dark mode', 'light mode', 'responsive',
      'feature', 'page', 'component', 'button', 'form', 'nav', 'header', 'footer',
    ];
    const lower = message.toLowerCase();
    return editKeywords.some((kw) => lower.includes(kw)) ? 'edit' : 'chat';
  }

  /**
   * Given a user edit request and the current project, generates file-level changes
   * and returns them as structured EditResult for review before applying.
   */
  async planEdits(
    request: string,
    model: string,
    project: { id: string; name: string; files: { path: string; content: string }[]; brain: string }
  ): Promise<import('@/types').EditResult> {
    // Build a concise file listing with content for smaller context
    const fileList = project.files
      .slice(0, 20) // cap to avoid huge prompts
      .map((f) => `### ${f.path}\n${f.content.slice(0, 800)}${f.content.length > 800 ? '\n... (truncated)' : ''}`)
      .join('\n\n');

    const systemPrompt = `You are an expert senior software engineer working on a React + TypeScript + TailwindCSS project called "${project.name}".
Your task is to implement the user's request by modifying or creating files.

Rules:
- Return ONLY valid JSON, no markdown, no explanations outside JSON
- Write complete file contents (not snippets or diffs)
- Use TailwindCSS for all styling (plain classes only)
- NEVER import from shadcn/ui, @/components/ui, or any UI library
- Every component/route file MUST have a default export
- Keep existing imports and patterns consistent
- Only change files that actually need changing`;

    const userPrompt = `Project Brain Context:
${project.brain}

Current Files:
${fileList}

User Request: "${request}"

Return a JSON object with exactly this shape:
{
  "summary": "one-sentence summary of what was done",
  "reasoning": "brief explanation of the approach taken",
  "isEdit": true,
  "fileEdits": [
    {
      "path": "src/components/Example.tsx",
      "description": "what changed and why",
      "isNew": false,
      "newContent": "full file content here"
    }
  ]
}`;

    const result = await ollamaService.generateJSON<import('@/types').EditResult>(
      model,
      userPrompt,
      systemPrompt
    );

    // Enrich with oldContent from the existing project files
    const enriched: import('@/types').EditResult = {
      ...result,
      isEdit: true,
      fileEdits: (result.fileEdits || []).map((edit) => {
        const existing = project.files.find((f) => f.path === edit.path);
        return {
          ...edit,
          oldContent: existing?.content || '',
          isNew: !existing,
        };
      }),
    };

    return enriched;
  }
}

export const agentSystem = new AgentSystem();
