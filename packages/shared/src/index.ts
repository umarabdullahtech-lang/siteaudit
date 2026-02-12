// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
}

// Project types
export interface Project {
  id: string;
  name: string;
  url: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Audit types
export type AuditStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface AuditConfig {
  maxDepth: number;
  maxPages: number;
}

export interface Audit {
  id: string;
  projectId: string;
  status: AuditStatus;
  config: AuditConfig;
  results: AuditResults | null;
  createdAt: Date;
  completedAt: Date | null;
}

// Results types
export interface AuditResults {
  score: number;
  pagesAnalyzed: number;
  errors: number;
  warnings: number;
  pages: PageResult[];
  lighthouse: LighthouseResult | null;
  aiInsights: AiInsight[];
}

export interface PageResult {
  url: string;
  statusCode: number;
  title: string;
  analysis: PageAnalysis;
  error?: string;
}

export interface PageAnalysis {
  meta: {
    title: string | null;
    description: string | null;
    keywords: string | null;
    canonical: string | null;
    robots: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: string[];
  };
  links: {
    internal: number;
    external: number;
    broken: string[];
  };
  schema: {
    hasStructuredData: boolean;
    types: string[];
  };
  issues: Issue[];
}

export interface Issue {
  type: 'error' | 'warning';
  message: string;
  element?: string;
}

export interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  metrics: {
    fcp: number;
    lcp: number;
    cls: number;
    tbt: number;
    speedIndex: number;
  };
}

export interface AiInsight {
  type: 'suggestion' | 'fix' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  affectedPages?: string[];
  codeSnippet?: string;
}

// API request/response types
export interface CreateAuditRequest {
  url: string;
  maxDepth?: number;
  maxPages?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  name: string | null;
  accessToken: string;
}

// WebSocket event types
export interface AuditProgressEvent {
  auditId: string;
  progress: number;
  status: string;
}

export interface AuditCompleteEvent {
  auditId: string;
  results: AuditResults;
}

export interface AuditErrorEvent {
  auditId: string;
  error: string;
}
