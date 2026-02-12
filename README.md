# SiteAudit - AI-Powered Website Analysis

A comprehensive website auditing platform with AI-powered insights for SEO, performance, and content quality analysis.

## Features

- 🔍 **Deep Crawling** - Playwright-based crawler with configurable depth and page limits
- 📊 **Technical SEO Analysis** - Meta tags, headings, images, links, and schema markup
- ⚡ **Performance Metrics** - Lighthouse integration for Core Web Vitals
- 🤖 **AI Insights** - OpenAI/Anthropic powered content analysis and suggestions
- 📈 **Real-time Progress** - WebSocket-based live updates during audits
- 📄 **Export Options** - PDF and CSV report generation

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS
- NextAuth.js (Email + OAuth)
- Socket.io Client
- Recharts for visualizations

### Backend
- NestJS
- Prisma (PostgreSQL)
- Mongoose (MongoDB)
- BullMQ + Redis
- Playwright
- Lighthouse

### AI
- OpenAI GPT-3.5/4
- Anthropic Claude

## Project Structure

```
siteaudit/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── shared/       # Shared types
│   └── database/     # Database utilities
├── turbo.json        # Turborepo config
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL
- MongoDB
- Redis

## Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd siteaudit
pnpm install
```

### 2. Environment Setup

Copy environment files:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Configure the following in your `.env` files:

**Frontend (`apps/web/.env.local`):**
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `GITHUB_ID` / `GITHUB_SECRET` - OAuth credentials

**Backend (`apps/api/.env`):**
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` / `REDIS_PORT` - Redis connection
- `JWT_SECRET` - JWT signing key
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - AI provider key

### 3. Database Setup

```bash
# Generate Prisma client
pnpm --filter api db:generate

# Run migrations
pnpm --filter api db:migrate
```

### 4. Start Development

```bash
# Start all services
pnpm dev

# Or start individually
pnpm --filter web dev    # Frontend on http://localhost:3000
pnpm --filter api dev    # Backend on http://localhost:4000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Audits
- `POST /api/audits` - Create new audit
- `GET /api/audits` - List user's audits
- `GET /api/audits/:id` - Get audit details

### WebSocket Events
- `subscribeToAudit` - Subscribe to audit progress
- `auditProgress` - Receive progress updates
- `auditComplete` - Receive completion notification
- `auditError` - Receive error notification

## Scripts

```bash
pnpm dev          # Start development servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm test         # Run tests
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   NestJS    │────▶│ PostgreSQL  │
│  Frontend   │     │   Backend   │     │  (Users)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   
       │                   ▼                   
       │           ┌─────────────┐     ┌─────────────┐
       │           │   BullMQ    │────▶│   MongoDB   │
       │           │   (Redis)   │     │  (Crawl)    │
       │           └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐     ┌─────────────┐
       └──────────▶│  WebSocket  │────▶│  Crawler    │
                   │   Gateway   │     │ (Playwright)│
                   └─────────────┘     └─────────────┘
```

## License

MIT
