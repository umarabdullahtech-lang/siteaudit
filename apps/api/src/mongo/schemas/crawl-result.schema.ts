import mongoose, { Document, Schema } from 'mongoose';

export interface ICrawlResult extends Document {
  auditId: string;
  url: string;
  statusCode: number;
  title: string;
  loadTimeMs: number;
  contentLength: number;
  analysis: {
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
    issues: Array<{
      type: 'error' | 'warning';
      message: string;
      element?: string;
    }>;
  };
  rawHtml?: string;
  headers?: Record<string, string>;
  error?: string;
  crawledAt: Date;
}

const IssueSchema = new Schema(
  {
    type: { type: String, enum: ['error', 'warning'], required: true },
    message: { type: String, required: true },
    element: { type: String },
  },
  { _id: false },
);

const MetaSchema = new Schema(
  {
    title: { type: String, default: null },
    description: { type: String, default: null },
    keywords: { type: String, default: null },
    canonical: { type: String, default: null },
    robots: { type: String, default: null },
    ogTitle: { type: String, default: null },
    ogDescription: { type: String, default: null },
    ogImage: { type: String, default: null },
  },
  { _id: false },
);

const CrawlResultSchema = new Schema<ICrawlResult>(
  {
    auditId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    statusCode: { type: Number, default: 0 },
    title: { type: String, default: '' },
    loadTimeMs: { type: Number, default: 0 },
    contentLength: { type: Number, default: 0 },
    analysis: {
      meta: { type: MetaSchema, default: () => ({}) },
      headings: {
        h1: [String],
        h2: [String],
        h3: [String],
      },
      images: {
        total: { type: Number, default: 0 },
        withAlt: { type: Number, default: 0 },
        withoutAlt: [String],
      },
      links: {
        internal: { type: Number, default: 0 },
        external: { type: Number, default: 0 },
        broken: [String],
      },
      schema: {
        hasStructuredData: { type: Boolean, default: false },
        types: [String],
      },
      issues: [IssueSchema],
    },
    rawHtml: { type: String, select: false }, // excluded by default for perf
    headers: { type: Schema.Types.Mixed },
    error: { type: String },
    crawledAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'crawl_results',
  },
);

// Compound index for efficient queries
CrawlResultSchema.index({ auditId: 1, url: 1 }, { unique: true });
CrawlResultSchema.index({ auditId: 1, 'analysis.issues.type': 1 });

export const CrawlResultModel =
  mongoose.models.CrawlResult ||
  mongoose.model<ICrawlResult>('CrawlResult', CrawlResultSchema);
