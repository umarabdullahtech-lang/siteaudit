import jsPDF from 'jspdf'
import type { AuditResults, PageResult, AiInsight, LighthouseResult } from '@shared/types'

interface ExportPdfOptions {
  siteUrl: string
  auditId: string
  createdAt: string
  results: AuditResults
}

export function exportAuditPdf({ siteUrl, auditId, createdAt, results }: ExportPdfOptions) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addPage = () => {
    doc.addPage()
    y = margin
  }

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      addPage()
    }
  }

  // ── Title Page ──────────────────────────────────────
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('SiteAudit Report', margin, y + 10)
  y += 20

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(siteUrl, margin, y)
  y += 8
  doc.text(`Generated: ${new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y)
  y += 8
  doc.text(`Audit ID: ${auditId}`, margin, y)
  y += 16
  doc.setTextColor(0, 0, 0)

  // ── Health Score ────────────────────────────────────
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Overall Health Score', margin, y)
  y += 10

  // Score circle (simplified as text)
  const scoreColor = results.score >= 80 ? [16, 185, 129] : results.score >= 60 ? [245, 158, 11] : [239, 68, 68]
  doc.setFontSize(48)
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
  doc.text(`${results.score}`, margin, y + 12)
  doc.setFontSize(16)
  doc.text('/100', margin + 36, y + 12)
  doc.setTextColor(0, 0, 0)
  y += 20

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Pages Analyzed: ${results.pagesAnalyzed}`, margin, y)
  y += 6
  doc.text(`Errors: ${results.errors}`, margin, y)
  y += 6
  doc.text(`Warnings: ${results.warnings}`, margin, y)
  y += 14

  // ── AI Insights ─────────────────────────────────────
  if (results.aiInsights && results.aiInsights.length > 0) {
    checkPageBreak(40)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('AI Insights', margin, y)
    y += 10

    for (const insight of results.aiInsights) {
      checkPageBreak(24)
      const priorityLabel = `[${insight.priority.toUpperCase()}]`
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')

      if (insight.priority === 'high') doc.setTextColor(239, 68, 68)
      else if (insight.priority === 'medium') doc.setTextColor(245, 158, 11)
      else doc.setTextColor(16, 185, 129)

      doc.text(priorityLabel, margin, y)
      doc.setTextColor(0, 0, 0)
      doc.text(` ${insight.title}`, margin + doc.getTextWidth(priorityLabel) + 2, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      const descLines = doc.splitTextToSize(insight.description, contentWidth)
      doc.text(descLines, margin, y)
      y += descLines.length * 4 + 4
      doc.setTextColor(0, 0, 0)
    }
    y += 6
  }

  // ── Lighthouse Performance ──────────────────────────
  if (results.lighthouse) {
    checkPageBreak(60)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Performance (Lighthouse)', margin, y)
    y += 10

    const lh = results.lighthouse
    const categories = [
      { name: 'Performance', score: lh.performance },
      { name: 'Accessibility', score: lh.accessibility },
      { name: 'Best Practices', score: lh.bestPractices },
      { name: 'SEO', score: lh.seo },
    ]

    doc.setFontSize(11)
    for (const cat of categories) {
      doc.setFont('helvetica', 'normal')
      doc.text(`${cat.name}:`, margin, y)
      const sc = cat.score
      if (sc >= 90) doc.setTextColor(16, 185, 129)
      else if (sc >= 50) doc.setTextColor(245, 158, 11)
      else doc.setTextColor(239, 68, 68)
      doc.setFont('helvetica', 'bold')
      doc.text(`${sc}`, margin + 50, y)
      doc.setTextColor(0, 0, 0)
      y += 7
    }

    y += 6
    checkPageBreak(40)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Core Web Vitals', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const metrics = [
      { name: 'First Contentful Paint', value: `${(lh.metrics.fcp / 1000).toFixed(1)}s` },
      { name: 'Largest Contentful Paint', value: `${(lh.metrics.lcp / 1000).toFixed(1)}s` },
      { name: 'Cumulative Layout Shift', value: lh.metrics.cls.toFixed(3) },
      { name: 'Total Blocking Time', value: `${lh.metrics.tbt}ms` },
      { name: 'Speed Index', value: `${(lh.metrics.speedIndex / 1000).toFixed(1)}s` },
    ]
    for (const m of metrics) {
      doc.text(`${m.name}: ${m.value}`, margin, y)
      y += 6
    }
    y += 8
  }

  // ── Technical Issues ────────────────────────────────
  const issueMap = new Map<string, { type: string; message: string; count: number }>()
  if (results.pages) {
    for (const page of results.pages) {
      if (page.analysis?.issues) {
        for (const issue of page.analysis.issues) {
          const key = `${issue.type}:${issue.message}`
          const existing = issueMap.get(key)
          if (existing) existing.count++
          else issueMap.set(key, { type: issue.type, message: issue.message, count: 1 })
        }
      }
    }
  }

  const issues = Array.from(issueMap.values()).sort((a, b) => {
    if (a.type === 'error' && b.type !== 'error') return -1
    if (a.type !== 'error' && b.type === 'error') return 1
    return b.count - a.count
  })

  if (issues.length > 0) {
    checkPageBreak(30)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Technical Issues', margin, y)
    y += 10

    for (const issue of issues.slice(0, 30)) {
      checkPageBreak(14)
      doc.setFontSize(9)
      const tag = issue.type === 'error' ? '[ERROR]' : '[WARNING]'
      if (issue.type === 'error') doc.setTextColor(239, 68, 68)
      else doc.setTextColor(245, 158, 11)
      doc.setFont('helvetica', 'bold')
      doc.text(tag, margin, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      const issueText = doc.splitTextToSize(`${issue.message} (${issue.count} page${issue.count > 1 ? 's' : ''})`, contentWidth - 25)
      doc.text(issueText, margin + 25, y)
      y += issueText.length * 4 + 4
    }
    y += 6
  }

  // ── Page-by-Page Summary ────────────────────────────
  if (results.pages && results.pages.length > 0) {
    checkPageBreak(30)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Pages Analyzed', margin, y)
    y += 10

    doc.setFontSize(9)
    for (const page of results.pages.slice(0, 50)) {
      checkPageBreak(16)
      doc.setFont('helvetica', 'bold')
      const statusColor = page.statusCode === 200 ? [16, 185, 129] : [239, 68, 68]
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
      doc.text(`${page.statusCode}`, margin, y)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      const truncUrl = page.url.length > 80 ? page.url.substring(0, 77) + '...' : page.url
      doc.text(truncUrl, margin + 15, y)
      y += 5

      const meta = page.analysis?.meta
      const hasTitle = !!meta?.title
      const hasDesc = !!meta?.description
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`Title: ${hasTitle ? '✓' : '✗'}  Meta Desc: ${hasDesc ? '✓' : '✗'}  Issues: ${page.analysis?.issues?.length || 0}`, margin + 15, y)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      y += 7
    }
  }

  // ── Footer on each page ─────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `SiteAudit Report — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  doc.save(`siteaudit-${auditId.slice(0, 8)}.pdf`)
}
