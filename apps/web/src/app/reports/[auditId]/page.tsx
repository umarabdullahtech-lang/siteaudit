'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Download,
  FileText,
  Code,
  Zap,
  Brain,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { useAuditStore } from '@/store/audit'
import { useAuthStore } from '@/store/auth'
import type { AuditResults, PageAnalysis, Issue, AiInsight, LighthouseResult } from '@shared/types'

type TabType = 'technical' | 'content' | 'performance'

export default function ReportPage() {
  const params = useParams()
  const auditId = params.auditId as string
  const { currentAudit, currentLoading, currentError, fetchAudit } = useAuditStore()
  const { loadFromStorage } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('technical')

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (auditId) {
      fetchAudit(auditId)
    }
  }, [auditId, fetchAudit])

  const tabs = [
    { id: 'technical', label: 'Technical SEO', icon: Code },
    { id: 'content', label: 'Content Analysis', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Zap },
  ] as const

  const handleExportPDF = () => {
    // TODO: Implement with jsPDF
    alert('PDF export coming soon!')
  }

  const handleExportCSV = () => {
    // TODO: Implement with PapaParse
    alert('CSV export coming soon!')
  }

  // Loading state
  if (currentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading audit report...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (currentError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load report</h2>
          <p className="text-gray-500 mb-4">{currentError}</p>
          <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!currentAudit) return null

  const results = currentAudit.results as AuditResults | null
  const project = (currentAudit as any).project
  const siteUrl = project?.url || 'Unknown site'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Audit Report</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{siteUrl}</span>
                  {project?.url && (
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4" /> PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Status banner for non-complete audits */}
        {currentAudit.status !== 'complete' && (
          <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${
            currentAudit.status === 'failed'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            {currentAudit.status === 'running' && <Loader2 className="w-5 h-5 animate-spin" />}
            {currentAudit.status === 'pending' && <Loader2 className="w-5 h-5" />}
            {currentAudit.status === 'failed' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">
              {currentAudit.status === 'running' && 'Audit is currently running...'}
              {currentAudit.status === 'pending' && 'Audit is queued and waiting to start...'}
              {currentAudit.status === 'failed' && 'This audit failed. Please try again.'}
            </span>
          </div>
        )}

        {results && (
          <>
            {/* Health Score Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Health Score</h2>
                  <p className="text-gray-500">
                    Based on {results.pagesAnalyzed || 0} page{results.pagesAnalyzed !== 1 ? 's' : ''} analyzed
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${
                    results.score >= 80 ? 'text-green-600' : results.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {results.score}
                  </div>
                  <div className="text-gray-500">/100</div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {results.pagesAnalyzed || 0}
                    </div>
                    <div className="text-sm text-gray-500">Pages Analyzed</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{results.errors || 0}</div>
                    <div className="text-sm text-gray-500">Errors</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{results.warnings || 0}</div>
                    <div className="text-sm text-gray-500">Warnings</div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {results.aiInsights && results.aiInsights.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 mb-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6" />
                  <h2 className="text-lg font-semibold">AI Insights</h2>
                </div>
                <p className="text-purple-100 mb-4">
                  Based on our analysis, here are the top priorities for improving your site&apos;s SEO:
                </p>
                <ul className="space-y-3">
                  {results.aiInsights.map((insight: AiInsight, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        insight.priority === 'high'
                          ? 'bg-red-400/30 text-red-100'
                          : insight.priority === 'medium'
                          ? 'bg-yellow-400/30 text-yellow-100'
                          : 'bg-green-400/30 text-green-100'
                      }`}>
                        {insight.priority}
                      </span>
                      <div>
                        <span className="font-medium">{insight.title}</span>
                        <p className="text-purple-200 text-sm mt-0.5">{insight.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="border-b border-gray-100">
                <div className="flex">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition ${
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'technical' && <TechnicalTab results={results} />}
                {activeTab === 'content' && <ContentTab results={results} />}
                {activeTab === 'performance' && <PerformanceTab results={results} />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TechnicalTab({ results }: { results: AuditResults }) {
  // Aggregate issues across all pages
  const issueMap = new Map<string, { type: string; message: string; count: number }>()

  if (results.pages) {
    for (const page of results.pages) {
      if (page.analysis?.issues) {
        for (const issue of page.analysis.issues) {
          const key = `${issue.type}:${issue.message}`
          const existing = issueMap.get(key)
          if (existing) {
            existing.count++
          } else {
            issueMap.set(key, { type: issue.type, message: issue.message, count: 1 })
          }
        }
      }
    }
  }

  const issues = Array.from(issueMap.values()).sort((a, b) => {
    if (a.type === 'error' && b.type !== 'error') return -1
    if (a.type !== 'error' && b.type === 'error') return 1
    return b.count - a.count
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />
    }
  }

  if (!issues.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
        <p className="text-lg font-medium text-green-600">No technical issues found!</p>
        <p className="text-sm">Your site looks great from a technical SEO perspective.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg">
          {getIcon(issue.type)}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{issue.message}</h4>
            <p className="text-sm text-gray-500">
              Found on {issue.count} page{issue.count !== 1 ? 's' : ''}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            issue.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {issue.type}
          </span>
        </div>
      ))}
    </div>
  )
}

function ContentTab({ results }: { results: AuditResults }) {
  const pages = results.pages || []

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">
          Content Analysis: {pages.length} page{pages.length !== 1 ? 's' : ''} scanned
        </h4>
        <p className="text-sm text-blue-700">
          {results.errors === 0
            ? 'Content quality looks solid. Keep it up!'
            : `Found ${results.errors} content issues that need attention.`}
        </p>
      </div>

      {/* Per-page breakdown */}
      {pages.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Page-by-Page Analysis</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {pages.slice(0, 20).map((page, i) => {
              const meta = page.analysis?.meta
              const hasTitle = !!meta?.title
              const hasDesc = !!meta?.description

              return (
                <div key={i} className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-900 truncate max-w-sm">
                      {page.title || page.url}
                    </span>
                    <span className={`text-sm ${page.statusCode === 200 ? 'text-green-600' : 'text-red-600'}`}>
                      {page.statusCode}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 truncate">{page.url}</p>
                  <div className="flex gap-3 text-xs">
                    <span className={hasTitle ? 'text-green-600' : 'text-red-600'}>
                      {hasTitle ? '✓' : '✗'} Title
                    </span>
                    <span className={hasDesc ? 'text-green-600' : 'text-red-600'}>
                      {hasDesc ? '✓' : '✗'} Meta Description
                    </span>
                    {page.analysis?.images && (
                      <span className={page.analysis.images.withoutAlt.length === 0 ? 'text-green-600' : 'text-yellow-600'}>
                        Images: {page.analysis.images.withAlt}/{page.analysis.images.total} alt text
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function PerformanceTab({ results }: { results: AuditResults }) {
  const lh = results.lighthouse

  if (!lh) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Zap className="w-12 h-12 mx-auto mb-3" />
        <p className="text-lg">No performance data available</p>
        <p className="text-sm">Lighthouse analysis was not completed for this audit.</p>
      </div>
    )
  }

  const categories = [
    { name: 'Performance', score: lh.performance },
    { name: 'Accessibility', score: lh.accessibility },
    { name: 'Best Practices', score: lh.bestPractices },
    { name: 'SEO', score: lh.seo },
  ]

  const metrics = [
    { name: 'First Contentful Paint', value: `${(lh.metrics.fcp / 1000).toFixed(1)}s`, score: lh.metrics.fcp },
    { name: 'Largest Contentful Paint', value: `${(lh.metrics.lcp / 1000).toFixed(1)}s`, score: lh.metrics.lcp },
    { name: 'Cumulative Layout Shift', value: lh.metrics.cls.toFixed(3), score: lh.metrics.cls },
    { name: 'Total Blocking Time', value: `${lh.metrics.tbt}ms`, score: lh.metrics.tbt },
    { name: 'Speed Index', value: `${(lh.metrics.speedIndex / 1000).toFixed(1)}s`, score: lh.metrics.speedIndex },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-100'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-100'
    return 'text-red-600 bg-red-50 border-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Category Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <div key={i} className={`p-4 border rounded-lg text-center ${getScoreColor(cat.score)}`}>
            <div className="text-3xl font-bold">{cat.score}</div>
            <div className="text-sm mt-1">{cat.name}</div>
          </div>
        ))}
      </div>

      {/* Core Web Vitals */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Core Web Vitals</h4>
        <div className="space-y-3">
          {metrics.map((metric, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{metric.name}</div>
                <div className="text-sm text-gray-500">{metric.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
