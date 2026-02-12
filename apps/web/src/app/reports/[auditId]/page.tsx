'use client'

import { useState } from 'react'
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
} from 'lucide-react'

type TabType = 'technical' | 'content' | 'performance'

export default function ReportPage({ params }: { params: { auditId: string } }) {
  const [activeTab, setActiveTab] = useState<TabType>('technical')

  const tabs = [
    { id: 'technical', label: 'Technical SEO', icon: Code },
    { id: 'content', label: 'Content Analysis', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Zap },
  ] as const

  const handleExportPDF = () => {
    // TODO: Implement PDF export with jsPDF
    console.log('Exporting PDF...')
  }

  const handleExportCSV = () => {
    // TODO: Implement CSV export with PapaParse
    console.log('Exporting CSV...')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Audit Report
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>https://example.com</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Health Score Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Overall Health Score
              </h2>
              <p className="text-gray-500">Based on 47 pages analyzed</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-green-600">87</div>
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
                <div className="text-2xl font-bold text-gray-900">156</div>
                <div className="text-sm text-gray-500">Passed</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">5</div>
                <div className="text-sm text-gray-500">Errors</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">23</div>
                <div className="text-sm text-gray-500">Warnings</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6" />
            <h2 className="text-lg font-semibold">AI Insights</h2>
          </div>
          <p className="text-purple-100 mb-4">
            Based on our analysis, here are the top priorities for improving your site&apos;s SEO:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-purple-200">1.</span>
              <span>Add alt text to 12 images missing accessibility attributes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-200">2.</span>
              <span>Fix duplicate meta descriptions on 3 pages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-200">3.</span>
              <span>Improve LCP by lazy-loading below-fold images</span>
            </li>
          </ul>
        </div>

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
            {activeTab === 'technical' && <TechnicalTab />}
            {activeTab === 'content' && <ContentTab />}
            {activeTab === 'performance' && <PerformanceTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

function TechnicalTab() {
  const issues = [
    { type: 'error', title: 'Missing H1 tag', pages: 2, description: 'Pages without a primary heading' },
    { type: 'error', title: 'Broken internal links', pages: 3, description: '404 errors on internal links' },
    { type: 'warning', title: 'Missing meta descriptions', pages: 5, description: 'Pages without meta descriptions' },
    { type: 'warning', title: 'Images without alt text', pages: 12, description: 'Missing accessibility attributes' },
    { type: 'pass', title: 'Valid robots.txt', pages: 1, description: 'Properly configured robots.txt' },
    { type: 'pass', title: 'XML sitemap present', pages: 1, description: 'Valid sitemap.xml found' },
  ]

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

  return (
    <div className="space-y-4">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg">
          {getIcon(issue.type)}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{issue.title}</h4>
            <p className="text-sm text-gray-500">{issue.description}</p>
          </div>
          <div className="text-sm text-gray-500">{issue.pages} pages</div>
        </div>
      ))}
    </div>
  )
}

function ContentTab() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Content Quality Score: 82/100</h4>
        <p className="text-sm text-blue-700">
          Your content is generally well-written with good keyword usage. Consider adding more
          internal links and updating older content.
        </p>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Page-by-Page Analysis</h4>
        <div className="space-y-3">
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="font-medium">/about</span>
              <span className="text-green-600">Score: 91</span>
            </div>
            <p className="text-sm text-gray-500">
              Well-structured content with appropriate heading hierarchy.
            </p>
          </div>
          <div className="p-4 border border-gray-100 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="font-medium">/blog/old-post</span>
              <span className="text-yellow-600">Score: 68</span>
            </div>
            <p className="text-sm text-gray-500">
              Consider updating this content - it&apos;s 18 months old and keyword density is low.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PerformanceTab() {
  const metrics = [
    { name: 'First Contentful Paint', value: '1.2s', score: 92, status: 'good' },
    { name: 'Largest Contentful Paint', value: '2.4s', score: 78, status: 'needs-improvement' },
    { name: 'Cumulative Layout Shift', value: '0.05', score: 95, status: 'good' },
    { name: 'Total Blocking Time', value: '150ms', score: 85, status: 'good' },
    { name: 'Speed Index', value: '2.1s', score: 80, status: 'needs-improvement' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
          <div className="text-3xl font-bold text-green-600">85</div>
          <div className="text-sm text-green-700">Mobile Performance</div>
        </div>
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
          <div className="text-3xl font-bold text-green-600">92</div>
          <div className="text-sm text-green-700">Desktop Performance</div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-3">Core Web Vitals</h4>
        <div className="space-y-3">
          {metrics.map((metric, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{metric.name}</div>
                <div className="text-sm text-gray-500">{metric.value}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                metric.status === 'good' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {metric.score}/100
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
