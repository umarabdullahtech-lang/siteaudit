'use client'

import { AlertCircle } from 'lucide-react'

interface CriticalErrorsCardProps {
  count: number
}

export function CriticalErrorsCard({ count }: CriticalErrorsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">Critical Errors</h3>
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-4xl font-bold ${count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {count}
        </span>
        <span className="text-gray-400 text-lg mb-1">issues</span>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {count > 0 ? 'Requires immediate attention' : 'No critical issues found'}
      </p>
    </div>
  )
}
