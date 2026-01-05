import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { TrendingUp, Star, Video, MessageSquare, CheckCircle } from 'lucide-react'
import './TestimonialsAnalytics.css'

export default function TestimonialsAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalTestimonials: 0,
    publishedTestimonials: 0,
    pendingTestimonials: 0,
    averageRating: 0,
    submissionRate: 0,
    videoSubmissions: 0,
    textOnlySubmissions: 0,
    featuredCount: 0,
    totalRequests: 0,
    requestConversionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch all testimonials
      const { data: testimonials, error: testimonialsError } = await supabase
        .from('testimonials')
        .select('status, rating, video_url')

      if (testimonialsError) throw testimonialsError

      // Fetch testimonial requests
      const { data: requests, error: requestsError } = await supabase
        .from('testimonial_requests')
        .select('status')

      if (requestsError) throw requestsError

      // Calculate analytics
      const total = testimonials?.length || 0
      const published = testimonials?.filter(t => t.status === 'published').length || 0
      const pending = testimonials?.filter(t => t.status === 'pending').length || 0
      const featured = testimonials?.filter(t => t.featured === true).length || 0

      // Calculate average rating
      const ratings = testimonials?.map(t => t.rating).filter(r => r) || []
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0

      // Video vs text
      const videoSubmissions = testimonials?.filter(t => t.video_url).length || 0
      const textOnly = total - videoSubmissions

      // Request conversion
      const totalRequests = requests?.length || 0
      const submittedRequests = requests?.filter(r => r.status === 'submitted').length || 0
      const conversionRate = totalRequests > 0
        ? (submittedRequests / totalRequests) * 100
        : 0

      // Submission rate (testimonials / total students with 5+ lessons)
      // This is an approximation - you might want to calculate this more precisely
      const submissionRate = totalRequests > 0
        ? (total / totalRequests) * 100
        : 0

      setAnalytics({
        totalTestimonials: total,
        publishedTestimonials: published,
        pendingTestimonials: pending,
        averageRating: avgRating,
        submissionRate,
        videoSubmissions,
        textOnlySubmissions: textOnly,
        featuredCount: featured,
        totalRequests,
        requestConversionRate: conversionRate
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
      alert('Error loading analytics: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="testimonials-analytics">
      <div className="analytics-header">
        <h2>📊 Testimonials Analytics</h2>
        <button onClick={fetchAnalytics} className="btn-refresh">
          Refresh
        </button>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-icon">
            <MessageSquare size={24} />
          </div>
          <div className="analytics-content">
            <div className="analytics-label">Total Testimonials</div>
            <div className="analytics-value">{analytics.totalTestimonials}</div>
            <div className="analytics-detail">
              {analytics.publishedTestimonials} published, {analytics.pendingTestimonials} pending
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <Star size={24} />
          </div>
          <div className="analytics-content">
            <div className="analytics-label">Average Rating</div>
            <div className="analytics-value">
              {analytics.averageRating.toFixed(1)} / 5.0
            </div>
            <div className="analytics-detail">
              {analytics.featuredCount} featured testimonials
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <TrendingUp size={24} />
          </div>
          <div className="analytics-content">
            <div className="analytics-label">Submission Rate</div>
            <div className="analytics-value">
              {analytics.submissionRate.toFixed(1)}%
            </div>
            <div className="analytics-detail">
              {analytics.totalRequests} requests sent
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <CheckCircle size={24} />
          </div>
          <div className="analytics-content">
            <div className="analytics-label">Conversion Rate</div>
            <div className="analytics-value">
              {analytics.requestConversionRate.toFixed(1)}%
            </div>
            <div className="analytics-detail">
              Requests → Submissions
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <Video size={24} />
          </div>
          <div className="analytics-content">
            <div className="analytics-label">Video Submissions</div>
            <div className="analytics-value">{analytics.videoSubmissions}</div>
            <div className="analytics-detail">
              {analytics.textOnlySubmissions} text-only
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">
            <Star size={24} />
          </div>
          <div className="analytics-content">
            <div className="analytics-label">Featured</div>
            <div className="analytics-value">{analytics.featuredCount}</div>
            <div className="analytics-detail">
              {analytics.totalTestimonials > 0
                ? ((analytics.featuredCount / analytics.totalTestimonials) * 100).toFixed(1)
                : 0}% of total
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

