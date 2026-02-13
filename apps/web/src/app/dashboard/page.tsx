'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Plus,
  LogOut,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard'
import { CriticalErrorsCard } from '@/components/dashboard/CriticalErrorsCard'
import { WarningsCard } from '@/components/dashboard/WarningsCard'
import { AuditProgress } from '@/components/dashboard/AuditProgress'
import { RecentAudits } from '@/components/dashboard/RecentAudits'
import { useAuthStore } from '@/store/auth'
import { useAuditStore } from '@/store/audit'
import { getErrorMessage } from '@/lib/api'

export default function Dashboard() {
  const router = useRouter()
  const { user, token, loadFromStorage, fetchProfile, logout } = useAuthStore()
  const {
    audits,
    auditsLoading,
    auditsError,
    activeCrawl,
    fetchAudits,
    startAudit,
    subscribeToCrawl,
  } = useAuditStore()

  const [url, setUrl] = useState('')
  const [startError, setStartError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Auth check
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    if (token) {
      fetchProfile()
      fetchAudits()
    } else {
      // Give a moment for token to load from storage
      const t = setTimeout(() => {
        const stored = localStorage.getItem('accessToken')
        if (!stored) router.push('/auth/signin')
      }, 500)
      return () => clearTimeout(t)
    }
  }, [token, fetchProfile, fetchAudits, router])

  // Subscribe to active crawl WebSocket
  useEffect(() => {
    if (activeCrawl) {
      const unsub = subscribeToCrawl(activeCrawl.auditId)
      return unsub
    }
  }, [activeCrawl?.auditId, subscribeToCrawl])

  // Compute summary stats from most recent completed audit
  const latestComplete = audits.find((a) => a.status === 'complete' && a.results)
  const results = latestComplete?.results as any
  const healthScore = results?.score ?? 0
  const errorCount = results?.errors ?? 0
  const warningCount = results?.warnings ?? 0

  const handleStartAudit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    setStartError(null)
    setIsStarting(true)

    try {
      await startAudit(url)
      setUrl('')
    } catch (err) {
      setStartError(getErrorMessage(err))
    } finally {
      setIsStarting(false)
    }
  }, [url, startAudit])

  const handleLogout = () => {
    logout()
    router.push('/auth/signin')
  }

  // Loading state
  if (!token && typeof window !== 'undefined' && !localStorage.getItem('accessToken')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
            SiteAudit
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* URL Input */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Start New Audit</h2>
          <form onSubmit={handleStartAudit} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., https://example.com)"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                disabled={isStarting || !!activeCrawl}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isStarting || !!activeCrawl || !url}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Starting...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" /> Start Audit
                </>
              )}
            </button>
          </form>

          {/* Error */}
          {startError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {startError}
            </div>
          )}

          {/* Progress Bar */}
          {activeCrawl && (
            <AuditProgress progress={activeCrawl.progress} status={activeCrawl.status} />
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <HealthScoreCard score={healthScore} trend={audits.length > 1 ? undefined : undefined} />
          <CriticalErrorsCard count={errorCount} />
          <WarningsCard count={warningCount} />
        </div>

        {/* Recent Audits */}
        {auditsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {auditsError}
            </span>
            <button
              onClick={() => fetchAudits()}
              className="text-red-600 hover:text-red-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        <RecentAudits audits={audits} loading={auditsLoading} />
      </div>
    </div>
  )
}
