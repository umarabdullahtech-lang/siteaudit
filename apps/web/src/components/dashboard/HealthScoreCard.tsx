'use client'

import { Activity, TrendingUp } from 'lucide-react'

interface HealthScoreCardProps {
  score: number
  trend?: string
}

export function HealthScoreCard({ score, trend }: HealthScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Health Score</h3>
        <div className={`w-10 h-10 rounded-lg ${getScoreBg(score)} flex items-center justify-center`}>
          <Activity className={`w-5 h-5 ${getScoreColor(score)}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-gray-400 text-lg mb-1">/100</span>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span>{trend} from last audit</span>
        </div>
      )}
    </div>
  )
}
