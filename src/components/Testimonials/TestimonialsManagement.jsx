import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Check, X, Star, Video, Eye, EyeOff, Trash2, MessageSquare } from 'lucide-react'
import TestimonialsAnalytics from './TestimonialsAnalytics'
import './TestimonialsManagement.css'

export default function TestimonialsManagement() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, approved, published
  const [selectedTestimonial, setSelectedTestimonial] = useState(null)

  useEffect(() => {
    fetchTestimonials()
  }, [filter])

  const fetchTestimonials = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('testimonials')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data: testimonialsData, error } = await query

      if (error) throw error

      // Fetch students and profiles separately
      if (testimonialsData && testimonialsData.length > 0) {
        const studentIds = testimonialsData.map(t => t.student_id)
        const { data: studentsData } = await supabase
          .from('students')
          .select('id')
          .in('id', studentIds)

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds)

        // Transform data to flatten student/profile structure
        const transformed = testimonialsData.map(t => {
          const profile = profilesData?.find(p => p.id === t.student_id)
          return {
            ...t,
            student_name: profile?.full_name || 'Unknown',
            student_email: profile?.email || ''
          }
        })

        setTestimonials(transformed)
      } else {
        setTestimonials([])
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error)
      alert('Error loading testimonials: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateTestimonialStatus = async (testimonialId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString()
      } else if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString()
        updateData.status = 'published'
        updateData.approved_at = updateData.approved_at || new Date().toISOString()
      }

      const { error } = await supabase
        .from('testimonials')
        .update(updateData)
        .eq('id', testimonialId)

      if (error) throw error

      fetchTestimonials()
    } catch (error) {
      console.error('Error updating testimonial:', error)
      alert('Error updating testimonial: ' + error.message)
    }
  }

  const toggleFeatured = async (testimonialId, currentlyFeatured) => {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update({ featured: !currentlyFeatured })
        .eq('id', testimonialId)

      if (error) throw error

      fetchTestimonials()
    } catch (error) {
      console.error('Error toggling featured status:', error)
      alert('Error updating testimonial: ' + error.message)
    }
  }

  const deleteTestimonial = async (testimonialId) => {
    if (!confirm('Are you sure you want to delete this testimonial? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', testimonialId)

      if (error) throw error

      fetchTestimonials()
    } catch (error) {
      console.error('Error deleting testimonial:', error)
      alert('Error deleting testimonial: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending', className: 'badge-pending' },
      approved: { label: 'Approved', className: 'badge-approved' },
      published: { label: 'Published', className: 'badge-published' },
      rejected: { label: 'Rejected', className: 'badge-rejected' }
    }
    const badge = badges[status] || badges.pending
    return <span className={`badge ${badge.className}`}>{badge.label}</span>
  }

  const filteredTestimonials = testimonials.filter(t => {
    if (filter === 'all') return true
    return t.status === filter
  })

  if (loading) {
    return (
      <div className="page-container">
        <div className="testimonials-loading">
          <div className="loading-spinner"></div>
          <p>Loading testimonials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="testimonials-management">
        <div className="testimonials-header">
          <div>
            <h1>💬 Testimonials Management</h1>
            <p className="testimonials-subtitle">Review, approve, and manage student testimonials</p>
          </div>
          <div className="testimonial-stats">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value">{testimonials.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Published</span>
              <span className="stat-value">{testimonials.filter(t => t.status === 'published').length}</span>
            </div>
          </div>
        </div>

        <div className="testimonials-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({testimonials.length})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({testimonials.filter(t => t.status === 'pending').length})
          </button>
          <button
            className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({testimonials.filter(t => t.status === 'approved').length})
          </button>
          <button
            className={`filter-btn ${filter === 'published' ? 'active' : ''}`}
            onClick={() => setFilter('published')}
          >
            Published ({testimonials.filter(t => t.status === 'published').length})
          </button>
        </div>

        <div className="testimonials-list">
          {filteredTestimonials.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
              <p>No testimonials found</p>
              <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                {filter === 'all' ? 'No testimonials have been submitted yet.' : `No ${filter} testimonials.`}
              </p>
            </div>
          ) : (
            filteredTestimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-student-info">
                    <div className="student-name">{testimonial.student_name}</div>
                    <div className="student-email">{testimonial.student_email}</div>
                    <div className="testimonial-meta">
                      <span className="lesson-count">{testimonial.lesson_count_when_submitted} lessons completed</span>
                      <span className="submitted-date">
                        {new Date(testimonial.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="testimonial-actions-header">
                    {getStatusBadge(testimonial.status)}
                    {testimonial.featured && (
                      <span className="badge badge-featured">⭐ Featured</span>
                    )}
                  </div>
                </div>

                <div className="testimonial-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      fill={star <= testimonial.rating ? '#FFD700' : 'none'}
                      style={{ color: star <= testimonial.rating ? '#FFD700' : '#ddd' }}
                    />
                  ))}
                </div>

                <div className="testimonial-text">{testimonial.testimonial_text}</div>

                {testimonial.video_url && (
                  <div className="testimonial-video">
                    <Video size={20} />
                    <a href={testimonial.video_url} target="_blank" rel="noopener noreferrer">
                      View Video Testimonial
                    </a>
                  </div>
                )}

                <div className="testimonial-actions">
                  {testimonial.status === 'pending' && (
                    <>
                      <button
                        className="btn-approve"
                        onClick={() => updateTestimonialStatus(testimonial.id, 'approved')}
                      >
                        <Check size={16} />
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => updateTestimonialStatus(testimonial.id, 'rejected')}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </>
                  )}
                  {testimonial.status === 'approved' && (
                    <button
                      className="btn-publish"
                      onClick={() => updateTestimonialStatus(testimonial.id, 'published')}
                    >
                      <Eye size={16} />
                      Publish
                    </button>
                  )}
                  <button
                    className={`btn-featured ${testimonial.featured ? 'active' : ''}`}
                    onClick={() => toggleFeatured(testimonial.id, testimonial.featured)}
                    title={testimonial.featured ? 'Remove from featured' : 'Mark as featured'}
                  >
                    {testimonial.featured ? <Star size={16} fill="#FFD700" /> : <Star size={16} />}
                    {testimonial.featured ? 'Featured' : 'Feature'}
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => deleteTestimonial(testimonial.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

