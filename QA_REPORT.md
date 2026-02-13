# SiteAudit QA Report

**Date:** 2026-02-13  
**Tester:** QA Engineer (Automated)  
**Version:** Commit `d2be541` (post-fixes)  
**Overall Status:** ✅ PASS WITH ISSUES

---

## 1. Setup & Build Verification

| Check | Status | Notes |
|-------|--------|-------|
| `pnpm install` | ✅ PASS | Clean install, lockfile up to date |
| `pnpm --filter web build` | ✅ PASS | Next.js builds successfully, 7 routes |
| `pnpm --filter api build` | ✅ PASS | NestJS compiles without errors |
| `pnpm --filter api test` | ✅ PASS | **17/17 tests pass** (3 suites) |
| ESLint warnings | ⚠️ | 1 warning: `react-hooks/exhaustive-deps` in `dashboard/page.tsx` line 65 |
| Next.js config warning | ✅ FIXED | `experimental.serverActions` was deprecated — removed |

### Build Output Summary
- **Frontend:** 7 routes, largest page `reports/[auditId]` at 259 kB First Load JS
- **Backend:** Compiles to `dist/` without errors
- **Shared types:** Used correctly via `workspace:*` protocol

---

## 2. Code Quality Audit

### 2.1 Hardcoded Secrets
| Finding | Severity | Status |
|---------|----------|--------|
| `JWT_SECRET=dev-secret-change-in-production` in `.env` | Medium | `.env` is in `.gitignore` — not committed. `.env.example` has `your-jwt-secret-change-me` placeholder. **OK for dev.** |
| `NEXTAUTH_SECRET=dev-secret-change-in-production` in `.env.local` | Medium | Also gitignored. OK for dev. |
| JWT fallback `'your-jwt-secret'` in `auth.module.ts` and `jwt.strategy.ts` | **Medium** | Fallback secrets if env var missing. Should throw instead of falling back silently. |

### 2.2 TODO/FIXME Comments
| File | Line | Comment |
|------|------|---------|
| `apps/web/src/lib/auth.ts` | 27 | `// TODO: Implement actual authentication with backend API` |

**Analysis:** The NextAuth credentials provider calls the backend API correctly, so this TODO is misleading — the implementation is done. The comment should be removed.

### 2.3 Environment Files
| File | Exists | Complete |
|------|--------|----------|
| `apps/api/.env.example` | ✅ | ✅ All required vars present |
| `apps/web/.env.example` | ✅ | ✅ Includes OAuth placeholders |
| `.gitignore` covers `.env`, `.env.local` | ✅ | Properly configured |

### 2.4 README
- ✅ Comprehensive setup instructions
- ✅ Architecture diagram
- ✅ API endpoints documented
- ✅ Prerequisites listed
- ⚠️ Missing: how to run tests (`cd apps/api && pnpm test`)

### 2.5 Docker Compose
- Docker not available in test environment, but config was reviewed manually
- ✅ Proper health checks on all services
- ✅ Correct environment variables for production
- ✅ Volume persistence for all databases
- ✅ Service dependencies with health conditions

### 2.6 Dead Code / Unused Imports
| Finding | Severity |
|---------|----------|
| `apps/web/src/components/auth/AuthProvider.tsx` — `SessionProvider` wrapper exists but is NOT used in `layout.tsx` | Low |
| `apps/web/src/lib/auth.ts` — NextAuth config exists with Google/GitHub providers, but the app primarily uses custom JWT auth via Zustand store | Low |
| `apps/web/src/types/next-auth.d.ts` — NextAuth type augmentation exists but NextAuth is barely integrated | Low |

---

## 3. Functional Testing

### 3.1 Backend Boot
- Cannot fully start due to missing PostgreSQL/MongoDB/Redis in test env
- Code review confirms proper connection handling with lifecycle hooks (`onModuleInit`/`onModuleDestroy`)
- Health endpoint at `GET /api/health` returns `{ status: 'ok', timestamp, uptime }`

### 3.2 Frontend Boot
- Build succeeds, all pages compile
- Static pages generated: `/`, `/auth/signin`, `/auth/signup`, `/dashboard`
- Dynamic pages: `/reports/[auditId]`, `/api/auth/[...nextauth]`

### 3.3 Export Functions
| Export | Status | Notes |
|--------|--------|-------|
| PDF (`jsPDF`) | ✅ | Well-structured: title page, health score, AI insights, Lighthouse, issues, page-by-page. Proper page breaks. |
| CSV (`PapaParse`) | ✅ | Comprehensive columns (25+ fields per page). Also has `exportIssuesCsv` helper. Handles empty arrays gracefully. |

### 3.4 AI Service Error Handling
- ✅ Graceful fallback when no API keys are set (returns rule-based insights)
- ✅ `try/catch` around all AI calls with fallback responses
- ✅ Separate `callAi()` helper prefers Anthropic, falls back to OpenAI, then returns null
- ✅ `generateCodeFix` returns null when no AI available
- ✅ Tests confirm fallback behavior (4 test cases)

---

## 4. Security Review

### 4.1 Authentication & Authorization

| Check | Status | Notes |
|-------|--------|-------|
| JWT auth guard on protected routes | ✅ | `AuditController` and `AiController` have `@UseGuards(JwtAuthGuard)` |
| Auth routes (register/login) are public | ✅ | No guard on auth endpoints |
| Health endpoint is public | ✅ | Appropriate |
| **IDOR on `GET /audits/:id`** | ✅ FIXED | Was returning any audit regardless of ownership. Now checks `project.userId === req.user.userId` |
| Password hashing | ✅ | bcrypt with salt rounds 12 |
| JWT expiry | ✅ | 7 days |

### 4.2 Rate Limiting
- ✅ `ThrottlerModule` configured globally with 3 tiers:
  - Short: 10 req/sec
  - Medium: 100 req/min
  - Long: 1000 req/hour
- ✅ `ThrottlerGuard` registered as global `APP_GUARD`
- ✅ Custom throttle on audit creation: 5 per minute
- ✅ Swagger has `@ApiBearerAuth()` decorators

### 4.3 CORS
- ✅ Configured in `main.ts`: `origin: process.env.FRONTEND_URL || 'http://localhost:3000'`
- ✅ WebSocket CORS matches frontend URL
- ✅ `credentials: true` enabled

### 4.4 Input Validation
| Endpoint | Validation | Status |
|----------|-----------|--------|
| `POST /auth/register` | `@IsEmail`, `@IsString`, `@MinLength(6)` | ✅ |
| `POST /auth/login` | `@IsEmail`, `@IsString`, `@MinLength(6)` | ✅ |
| `POST /audits` | `@IsUrl`, `@IsInt`, `@Min`/`@Max` | ✅ |
| `POST /ai/analyze` | ✅ FIXED — Added `@IsArray`, `@IsOptional` | ✅ |
| `POST /ai/generate-fix` | ✅ FIXED — Added `@IsString` decorators | ✅ |
| Global validation pipe | `whitelist: true, forbidNonWhitelisted: true` | ✅ Strips unknown fields |

### 4.5 SQL/NoSQL Injection
- ✅ PostgreSQL: Prisma ORM with parameterized queries — safe
- ✅ MongoDB: Mongoose with schemas — safe
- ✅ No raw SQL or `$where` usage found

### 4.6 Other Security
- ⚠️ **WebSocket has no authentication** — any client can subscribe to `audit:*` rooms. Should validate JWT on connection.
- ⚠️ **Crawler has no SSRF protection** — user-supplied URLs are crawled directly. Could hit internal network addresses (127.0.0.1, 169.254.x.x, etc.)

---

## 5. Architecture Review

### 5.1 Shared Types
- ✅ `packages/shared/src/index.ts` defines all interfaces used by both apps
- ✅ Properly referenced via `@shared/types` workspace protocol
- ✅ Jest `moduleNameMapper` configured for test resolution

### 5.2 WebSocket Integration
- ✅ `WebsocketGateway` emits `auditProgress`, `auditComplete`, `auditError`
- ✅ Room-based subscriptions (`audit:{id}`)
- ✅ Frontend `socket.ts` handles connect/disconnect/subscribe lifecycle
- ✅ Zustand store integrates WebSocket with cleanup function
- ⚠️ No WebSocket authentication (see Security section)

### 5.3 Database Schemas
- ✅ Prisma schema: `User`, `Account`, `Session`, `VerificationToken`, `Project`, `Audit`
- ✅ Proper indexes on `Project.userId`, `Audit.projectId`, `Audit.status`
- ✅ Cascade deletes configured
- ✅ MongoDB schemas: `CrawlResult` and `AuditCache` with compound indexes
- ✅ TTL index on `AuditCache.expiresAt`

### 5.4 Crawler Error Handling
- ✅ `try/finally` ensures browser is always closed
- ✅ Per-page `try/catch` — failed pages get `error` field, crawl continues
- ✅ 30s timeout per page navigation
- ✅ robots.txt respected
- ✅ Sitemap parsing with fallback to multiple URLs
- ⚠️ Browser instance stored as class field (`this.browser`) — could conflict if two crawls run simultaneously

### 5.5 Queue Processing
- ✅ BullMQ with 3 retry attempts, exponential backoff
- ✅ Job failure updates audit status to 'failed' and notifies via WebSocket
- ✅ Progress callbacks throughout the crawl pipeline

---

## 6. Deliverables Check

| Deliverable | Status | Details |
|-------------|--------|---------|
| **PDF Export** | ✅ | jsPDF with title page, score, AI insights, Lighthouse, issues, page list. Proper pagination. |
| **CSV Export** | ✅ | PapaParse with 25+ columns per page. Also has `exportIssuesCsv`. Quoted output. |
| **Dark Mode** | ✅ FIXED | Theme toggle (Light/Dark/System), Zustand store, CSS variables. Dashboard cards were missing dark classes — fixed. |
| **Mobile Responsive** | ✅ | Grid breakpoints (`md:grid-cols-3`), responsive nav (`flex-col sm:flex-row`), overflow scroll on tables, truncated URLs |
| **Rate Limiting** | ✅ | ThrottlerModule with 3 tiers + custom audit creation limit |
| **MongoDB Schemas** | ✅ | Compound index `{auditId, url}` (unique), issue type index, TTL on cache |
| **Tests** | ✅ | 17 tests: AuthService (5), AuditService (5), AiService (4 + 3 implicit) |

---

## 7. Issues Found

### CRITICAL (0)
None.

### HIGH (1) — FIXED
| # | Issue | Fix |
|---|-------|-----|
| H-1 | **IDOR Vulnerability:** `GET /api/audits/:id` returned any audit without ownership check. Any authenticated user could view other users' audit data. | Added `getAuditForUser()` method with ownership verification. Returns 403 Forbidden if not owner. |

### MEDIUM (5)
| # | Issue | Severity |
|---|-------|----------|
| M-1 | **WebSocket has no authentication.** Any client can connect and subscribe to audit rooms. Should validate JWT on WS handshake. | Medium |
| M-2 | **No SSRF protection on crawler.** User-supplied URLs go directly to Playwright. Could crawl internal/private IPs. Should block RFC 1918 and link-local addresses. | Medium |
| M-3 | **JWT fallback secret** in `auth.module.ts` and `jwt.strategy.ts`. If `JWT_SECRET` env var is missing, falls back to `'your-jwt-secret'` silently instead of failing. | Medium |
| M-4 | **Crawler browser instance is not concurrency-safe.** `this.browser` field could be overwritten if two crawl jobs run simultaneously. Should create browser per crawl. | Medium |
| M-5 | **AI controller DTOs lacked validation decorators.** `AnalyzeContentDto` and `GenerateFixDto` had no `class-validator` decorators, bypassing the global validation pipe. | Medium — **FIXED** |

### LOW (7)
| # | Issue | Severity |
|---|-------|----------|
| L-1 | Misleading TODO comment in `apps/web/src/lib/auth.ts:27` — implementation is done | Low |
| L-2 | `AuthProvider.tsx` (NextAuth `SessionProvider`) is defined but never used — dead code | Low |
| L-3 | NextAuth types (`next-auth.d.ts`) and config exist but the app uses custom JWT + Zustand, creating confusion | Low |
| L-4 | ESLint warning: `react-hooks/exhaustive-deps` in `dashboard/page.tsx` line 65 | Low |
| L-5 | Landing page (`page.tsx`) hardcodes `bg-gradient-to-br from-slate-50 to-slate-100` without dark mode support | Low |
| L-6 | Sign-in and sign-up pages don't support dark mode (`bg-gray-50` only) | Low |
| L-7 | `docker-compose.yml` uses deprecated `version: '3.8'` key (Docker Compose V2 ignores it, but it generates a warning) | Low |

---

## 8. Recommendations

### Priority 1 (Do Next)
1. **Add WebSocket authentication** — validate JWT on connection handshake in `WebsocketGateway.handleConnection()`
2. **Add SSRF protection** — block crawling private IP ranges and localhost
3. **Remove JWT fallback secrets** — throw an error if `JWT_SECRET` is not set
4. **Fix crawler concurrency** — create browser instance per crawl instead of class-level field

### Priority 2 (Soon)
5. Clean up NextAuth artifacts if not using OAuth (or fully integrate it)
6. Remove the misleading TODO comment
7. Add dark mode to landing page, sign-in, and sign-up pages
8. Add integration tests for API endpoints
9. Add E2E tests with Playwright

### Priority 3 (Nice to Have)
10. Add `password` field to `getUserById` exclude list (already has `select` but explicit exclude is safer)
11. Add request logging middleware
12. Add Sentry or similar error tracking
13. Consider adding `helmet` for security headers
14. Add CSRF protection for form submissions
15. Add pagination to `GET /audits` endpoint

---

## 9. Test Results

```
Test Suites: 3 passed, 3 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        ~9s

Suite Breakdown:
  AuthService:  5 tests (validate, login, register, conflict, unauthorized)
  AuditService: 5 tests (create, reuse project, getAudit, getUserAudits, updateStatus)
  AiService:    7 tests (fallback insights, empty results, content score, keywords, code fix null)
```

---

## 10. Fixes Applied in This QA Session

All fixes committed as `d2be541` and pushed to `origin/main`:

1. ✅ **IDOR fix:** Added `getAuditForUser()` with ownership check + `NotFoundException`/`ForbiddenException`
2. ✅ **AI controller validation:** Added `@IsArray`, `@IsOptional`, `@IsString` decorators
3. ✅ **Dark mode gaps:** Added `dark:` classes to `HealthScoreCard`, `CriticalErrorsCard`, `WarningsCard`, `RecentAudits`, `AuditProgress`
4. ✅ **Next.js config:** Removed deprecated `experimental.serverActions`
5. ✅ **MongoDB URI:** Fixed mismatch between `.env` and `.env.example` (added auth credentials)

---

*Report generated: 2026-02-13T15:04:00Z*
