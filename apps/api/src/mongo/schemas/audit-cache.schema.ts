import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditCache extends Document {
  auditId: string;
  siteUrl: string;
  lighthouse: {
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
  } | null;
  aiInsights: Array<{
    type: 'suggestion' | 'fix' | 'warning';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    affectedPages?: string[];
    codeSnippet?: string;
  }>;
  contentScore: {
    overall: number;
    readability: number;
    seoOptimization: number;
    technicalHealth: number;
    contentDepth: number;
    summary: string;
  } | null;
  keywords: Array<{
    keyword: string;
    relevance: string;
    currentUsage: number;
    suggestion: string;
  }>;
  summary: {
    totalPages: number;
    totalErrors: number;
    totalWarnings: number;
    score: number;
  };
  expiresAt: Date;
}

const AuditCacheSchema = new Schema<IAuditCache>(
  {
    auditId: { type: String, required: true, unique: true },
    siteUrl: { type: String, required: true },
    lighthouse: { type: Schema.Types.Mixed, default: null },
    aiInsights: [{ type: Schema.Types.Mixed }],
    contentScore: { type: Schema.Types.Mixed, default: null },
    keywords: [{ type: Schema.Types.Mixed }],
    summary: {
      totalPages: { type: Number, default: 0 },
      totalErrors: { type: Number, default: 0 },
      totalWarnings: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
    },
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  {
    timestamps: true,
    collection: 'audit_cache',
  },
);

export const AuditCacheModel =
  mongoose.models.AuditCache ||
  mongoose.model<IAuditCache>('AuditCache', AuditCacheSchema);
