'use client'

import Link from 'next/link'
import { ExternalLink, Clock, Loader2 } from 'lucide-react'

interface AuditRow {
  id: string
  status: string
  results?: any
  createdAt: string | Date
  project?: { url: string; name: string }
}

interface RecentAuditsProps {
  audits: AuditRow[]
  loading?: boolean
}

export function RecentAudits({ audits, loading }: RecentAuditsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Complete</span>
      case 'running':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Running
          </span>
        )
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Pending</span>
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Failed</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{status}</span>
    }
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Audits</h2>
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading audits...
        </div>
      </div>
    )
  }

  if (!audits.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Audits</h2>
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No audits yet</p>
          <p className="text-sm">Start your first audit by entering a URL above</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Audits</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Website</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Score</th>
              <th className="pb-3 font-medium">Errors</th>
              <th className="pb-3 font-medium">Warnings</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((audit) => {
              const results = audit.results as any
              const score = results?.score
              const errors = results?.errors ?? '-'
              const warnings = results?.warnings ?? '-'

              return (
                <tr key={audit.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {audit.project?.url || audit.project?.name || 'Unknown'}
                      </span>
                      {audit.project?.url && (
                        <a href={audit.project.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-4">{getStatusBadge(audit.status)}</td>
                  <td className="py-4">
                    {score != null ? (
                      <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4">
                    <span className={`${typeof errors === 'number' && errors > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {errors}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`${typeof warnings === 'number' && warnings > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {warnings}
                    </span>
                  </td>
                  <td className="py-4 text-gray-500 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(audit.createdAt)}
                    </div>
                  </td>
                  <td className="py-4">
                    {audit.status === 'complete' ? (
                      <Link
                        href={`/reports/${audit.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        View Report
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
