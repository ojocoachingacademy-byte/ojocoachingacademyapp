import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { sendThankYouEmail, sendCoachNotificationEmail } from '../../utils/testimonialEmailService'
import { Star, Video, Upload, X, Check } from 'lucide-react'
import './TestimonialSubmission.css'

export default function TestimonialSubmission({ onClose, onSuccess, studentId, lessonCount }) {
  const [testimonialText, setTestimonialText] = useState('')
  const [rating, setRating] = useState(5)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError('Video file must be less than 100MB')
        return
      }

      // Check file type
      if (!file.type.startsWith('video/')) {
        setError('Please upload a video file')
        return
      }

      setVideoFile(file)
      setError('')

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideoPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveVideo = () => {
    setVideoFile(null)
    setVideoPreview(null)
  }

  const uploadVideoToStorage = async (file, testimonialId) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${testimonialId}/${Date.now()}.${fileExt}`
      const filePath = `${studentId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('testimonial-videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('testimonial-videos')
        .getPublicUrl(filePath)

      return { url: publicUrl, path: filePath }
    } catch (error) {
      console.error('Error uploading video:', error)
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!testimonialText.trim()) {
      setError('Please write your testimonial')
      setLoading(false)
      return
    }

    try {
      // Create testimonial record first
      const { data: testimonial, error: testimonialError } = await supabase
        .from('testimonials')
        .insert({
          student_id: studentId,
          testimonial_text: testimonialText.trim(),
          rating,
          lesson_count_when_submitted: lessonCount || 0,
          status: 'pending'
        })
        .select()
        .single()

      if (testimonialError) throw testimonialError

      let videoUrl = null
      let videoStoragePath = null

      // Upload video if provided
      if (videoFile) {
        setUploading(true)
        try {
          const videoData = await uploadVideoToStorage(videoFile, testimonial.id)
          videoUrl = videoData.url
          videoStoragePath = videoData.path

          // Update testimonial with video URL
          const { error: updateError } = await supabase
            .from('testimonials')
            .update({
              video_url: videoUrl,
              video_storage_path: videoStoragePath
            })
            .eq('id', testimonial.id)

          if (updateError) {
            console.error('Error updating testimonial with video:', updateError)
          }
        } catch (videoError) {
          console.error('Error uploading video:', videoError)
          // Don't fail the whole submission if video upload fails
        } finally {
          setUploading(false)
        }
      }

      // Update testimonial request status if it exists
      await supabase
        .from('testimonial_requests')
        .update({
          status: 'submitted',
          testimonial_id: testimonial.id
        })
        .eq('student_id', studentId)
        .eq('status', 'pending')

      // Get student profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', studentId)
        .single()

      // Send thank you email to student
      if (profile?.email) {
        await sendThankYouEmail(profile.email, profile.full_name || 'Student')
      }

      // Get coach email and send notification
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('account_type', 'coach')
        .limit(1)
        .single()

      if (coachProfile?.email && profile?.full_name) {
        await sendCoachNotificationEmail(coachProfile.email, profile.full_name)
      }

      if (onSuccess) onSuccess(testimonial)
      if (onClose) onClose()
    } catch (error) {
      console.error('Error submitting testimonial:', error)
      setError(error.message || 'Error submitting testimonial. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content testimonial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Your Experience</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-group">
            <label>Your Rating</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-button ${star <= rating ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                >
                  <Star size={32} fill={star <= rating ? '#FFD700' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="testimonial-text">
              Your Testimonial <span className="required">*</span>
            </label>
            <textarea
              id="testimonial-text"
              value={testimonialText}
              onChange={(e) => setTestimonialText(e.target.value)}
              placeholder="Tell us about your experience with OJO Coaching Academy..."
              rows={6}
              required
              maxLength={2000}
            />
            <div className="char-count">
              {testimonialText.length} / 2000 characters
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="video-upload">
              Video Testimonial (Optional)
            </label>
            <div className="video-upload-area">
              {!videoFile ? (
                <>
                  <input
                    type="file"
                    id="video-upload"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="video-upload" className="video-upload-button">
                    <Video size={24} />
                    <span>Upload Video (Max 100MB)</span>
                  </label>
                  <p className="upload-hint">MP4, WebM, or QuickTime format</p>
                </>
              ) : (
                <div className="video-preview-container">
                  <video src={videoPreview} controls className="video-preview" />
                  <button
                    type="button"
                    className="remove-video-button"
                    onClick={handleRemoveVideo}
                  >
                    <X size={20} />
                    Remove Video
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || uploading || !testimonialText.trim()}
            >
              {uploading ? (
                <>Uploading Video...</>
              ) : loading ? (
                <>Submitting...</>
              ) : (
                <>
                  <Check size={18} />
                  Submit Testimonial
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

