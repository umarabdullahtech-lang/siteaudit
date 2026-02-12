'use client'

import { AlertTriangle } from 'lucide-react'

interface WarningsCardProps {
  count: number
}

export function WarningsCard({ count }: WarningsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">Warnings</h3>
        <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-4xl font-bold ${count > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
          {count}
        </span>
        <span className="text-gray-400 text-lg mb-1">warnings</span>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        {count > 0 ? 'Review recommended' : 'All good!'}
      </p>
    </div>
  )
}
