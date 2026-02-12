'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Activity,
  Clock,
  ExternalLink,
  Plus,
  LogOut,
  FileText,
  Settings,
} from 'lucide-react'
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard'
import { CriticalErrorsCard } from '@/components/dashboard/CriticalErrorsCard'
import { WarningsCard } from '@/components/dashboard/WarningsCard'
import { AuditProgress } from '@/components/dashboard/AuditProgress'
import { RecentAudits } from '@/components/dashboard/RecentAudits'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [url, setUrl] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditProgress, setAuditProgress] = useState(0)
  const [auditStatus, setAuditStatus] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setIsAuditing(true)
    setAuditProgress(0)
    setAuditStatus('Initializing audit...')

    // TODO: Connect to WebSocket for real-time progress
    // Simulate progress for now
    const steps = [
      { progress: 10, status: 'Fetching robots.txt...' },
      { progress: 20, status: 'Parsing sitemap...' },
      { progress: 40, status: 'Crawling pages...' },
      { progress: 60, status: 'Analyzing content...' },
      { progress: 75, status: 'Running Lighthouse...' },
      { progress: 90, status: 'AI analysis...' },
      { progress: 100, status: 'Complete!' },
    ]

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 1500))
      setAuditProgress(step.progress)
      setAuditStatus(step.status)
    }

    setIsAuditing(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-primary-600">
            SiteAudit
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
            <Link
              href="/api/auth/signout"
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* URL Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Start New Audit</h2>
          <form onSubmit={handleStartAudit} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., https://example.com)"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                disabled={isAuditing}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isAuditing || !url}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isAuditing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Auditing...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" /> Start Audit
                </>
              )}
            </button>
          </form>

          {/* Progress Bar */}
          {isAuditing && (
            <AuditProgress progress={auditProgress} status={auditStatus} />
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <HealthScoreCard score={87} trend="+3" />
          <CriticalErrorsCard count={5} />
          <WarningsCard count={23} />
        </div>

        {/* Recent Audits */}
        <RecentAudits />
      </div>
    </div>
  )
}
