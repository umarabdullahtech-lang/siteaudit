'use client'

interface AuditProgressProps {
  progress: number
  status: string
}

export function AuditProgress({ progress, status }: AuditProgressProps) {
  return (
    <div className="mt-6">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-400">{status}</span>
        <span className="text-gray-500 dark:text-gray-400">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
