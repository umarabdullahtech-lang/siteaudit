import Papa from 'papaparse'
import type { AuditResults } from '@shared/types'

interface ExportCsvOptions {
  siteUrl: string
  auditId: string
  results: AuditResults
}

export function exportAuditCsv({ siteUrl, auditId, results }: ExportCsvOptions) {
  // ── Build page-level rows ───────────────────────────
  const pageRows = (results.pages || []).map((page) => {
    const meta = page.analysis?.meta
    const images = page.analysis?.images
    const links = page.analysis?.links
    const issues = page.analysis?.issues || []

    return {
      'URL': page.url,
      'Status Code': page.statusCode,
      'Title': meta?.title || '',
      'Meta Description': meta?.description || '',
      'Meta Keywords': meta?.keywords || '',
      'Canonical': meta?.canonical || '',
      'Robots': meta?.robots || '',
      'OG Title': meta?.ogTitle || '',
      'OG Description': meta?.ogDescription || '',
      'OG Image': meta?.ogImage || '',
      'H1 Count': page.analysis?.headings?.h1?.length || 0,
      'H1 Text': (page.analysis?.headings?.h1 || []).join(' | '),
      'H2 Count': page.analysis?.headings?.h2?.length || 0,
      'H3 Count': page.analysis?.headings?.h3?.length || 0,
      'Total Images': images?.total || 0,
      'Images With Alt': images?.withAlt || 0,
      'Images Without Alt': images?.withoutAlt?.length || 0,
      'Internal Links': links?.internal || 0,
      'External Links': links?.external || 0,
      'Broken Links': (links?.broken || []).join(' | '),
      'Has Structured Data': page.analysis?.schema?.hasStructuredData ? 'Yes' : 'No',
      'Schema Types': (page.analysis?.schema?.types || []).join(' | '),
      'Errors': issues.filter((i) => i.type === 'error').length,
      'Warnings': issues.filter((i) => i.type === 'warning').length,
      'Issue Details': issues.map((i) => `[${i.type}] ${i.message}`).join(' | '),
    }
  })

  const csv = Papa.unparse(pageRows, {
    quotes: true,
    header: true,
  })

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `siteaudit-${auditId.slice(0, 8)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export just the issues as a separate CSV (useful for dev teams).
 */
export function exportIssuesCsv({ siteUrl, auditId, results }: ExportCsvOptions) {
  const rows: Record<string, string | number>[] = []

  for (const page of results.pages || []) {
    for (const issue of page.analysis?.issues || []) {
      rows.push({
        'Page URL': page.url,
        'Status Code': page.statusCode,
        'Issue Type': issue.type,
        'Issue Message': issue.message,
        'Element': issue.element || '',
      })
    }
  }

  if (rows.length === 0) {
    rows.push({
      'Page URL': siteUrl,
      'Status Code': 0,
      'Issue Type': 'info',
      'Issue Message': 'No issues found',
      'Element': '',
    })
  }

  const csv = Papa.unparse(rows, { quotes: true, header: true })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `siteaudit-issues-${auditId.slice(0, 8)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
