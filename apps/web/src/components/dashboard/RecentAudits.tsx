'use client'

import Link from 'next/link'
import { ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

// Mock data - will be replaced with API calls
const mockAudits = [
  {
    id: '1',
    url: 'https://example.com',
    score: 87,
    status: 'complete',
    createdAt: '2026-02-12T10:30:00Z',
    errors: 5,
    warnings: 23,
  },
  {
    id: '2',
    url: 'https://mysite.io',
    score: 72,
    status: 'complete',
    createdAt: '2026-02-11T15:45:00Z',
    errors: 12,
    warnings: 31,
  },
  {
    id: '3',
    url: 'https://test-shop.com',
    score: 94,
    status: 'complete',
    createdAt: '2026-02-10T09:00:00Z',
    errors: 1,
    warnings: 8,
  },
]

export function RecentAudits() {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Audits</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
              <th className="pb-3 font-medium">Website</th>
              <th className="pb-3 font-medium">Score</th>
              <th className="pb-3 font-medium">Errors</th>
              <th className="pb-3 font-medium">Warnings</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockAudits.map((audit) => (
              <tr key={audit.id} className="border-b border-gray-50 last:border-0">
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{audit.url}</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                </td>
                <td className="py-4">
                  <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${getScoreColor(audit.score)}`}>
                    {audit.score}
                  </span>
                </td>
                <td className="py-4">
                  <span className={`${audit.errors > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {audit.errors}
                  </span>
                </td>
                <td className="py-4">
                  <span className={`${audit.warnings > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {audit.warnings}
                  </span>
                </td>
                <td className="py-4 text-gray-500 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(audit.createdAt)}
                  </div>
                </td>
                <td className="py-4">
                  <Link
                    href={`/reports/${audit.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
