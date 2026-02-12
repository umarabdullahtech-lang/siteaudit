'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, CheckCircle, Zap, Shield, BarChart3 } from 'lucide-react'

export default function Home() {
  const { data: session } = useSession()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-primary-600">SiteAudit</div>
        <div className="flex gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-gray-600 px-4 py-2 hover:text-primary-600 transition"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          AI-Powered <span className="text-primary-600">Website Audits</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Get comprehensive insights into your website&apos;s SEO, performance, and content quality
          with advanced AI analysis.
        </p>
        <Link
          href={session ? '/dashboard' : '/auth/signup'}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition"
        >
          Start Free Audit <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Performance Analysis</h3>
            <p className="text-gray-600">
              Lighthouse integration for Core Web Vitals and performance scoring.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Technical SEO</h3>
            <p className="text-gray-600">
              Deep crawl analysis of meta tags, headings, links, and schema markup.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Content Review</h3>
            <p className="text-gray-600">
              OpenAI/Anthropic powered content quality and SEO suggestions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="bg-primary-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to improve your website?</h2>
          <p className="text-primary-100 mb-8">Start your free audit in less than 30 seconds.</p>
          <Link
            href={session ? '/dashboard' : '/auth/signup'}
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-primary-50 transition"
          >
            <CheckCircle className="w-5 h-5" /> Start Free Audit
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-gray-500">
        <p>&copy; 2026 SiteAudit. AI-powered website analysis.</p>
      </footer>
    </main>
  )
}
