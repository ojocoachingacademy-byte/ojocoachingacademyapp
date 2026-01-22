import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import './PackageHistory.css'

export default function PackageHistory({ studentId }) {
  const [packages, setPackages] = useState([])
  const [currentPackage, setCurrentPackage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      fetchPackages()
    }
  }, [studentId])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      
      // Fetch all packages for this student
      const { data: allPackages, error: packagesError } = await supabaseAdmin
        .from('student_packages')
        .select('*')
        .eq('student_id', studentId)
        .order('purchased_date', { ascending: false })

      if (packagesError) throw packagesError

      // Get current package from student record
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('current_package_id')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      const currentPackageId = studentData?.current_package_id
      const current = allPackages?.find(p => p.id === currentPackageId) || null

      setCurrentPackage(current)
      setPackages(allPackages || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
      setPackages([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="package-history-loading">Loading package history...</div>
  }

  if (packages.length === 0) {
    return (
      <div className="package-history-empty">
        <p>No packages purchased yet.</p>
      </div>
    )
  }

  return (
    <div className="package-history">
      {/* Current Package Highlight */}
      {currentPackage && (
        <div className="current-package-card">
          <div className="current-package-header">
            <h3>📦 Current Package</h3>
            <span className="active-badge">Active</span>
          </div>
          <div className="package-details-grid">
            <div className="package-detail-item">
              <span className="detail-label">Package Size:</span>
              <span className="detail-value">{currentPackage.package_size} lessons</span>
            </div>
            <div className="package-detail-item">
              <span className="detail-label">Price Paid:</span>
              <span className="detail-value">${currentPackage.price_paid.toFixed(2)}</span>
            </div>
            <div className="package-detail-item">
              <span className="detail-label">Price per Lesson:</span>
              <span className="detail-value">${currentPackage.price_per_lesson.toFixed(2)}</span>
            </div>
            <div className="package-detail-item">
              <span className="detail-label">Lessons Used:</span>
              <span className="detail-value">{currentPackage.lessons_used} / {currentPackage.lessons_purchased}</span>
            </div>
            <div className="package-detail-item">
              <span className="detail-label">Lessons Remaining:</span>
              <span className="detail-value highlight">{currentPackage.lessons_remaining}</span>
            </div>
            <div className="package-detail-item">
              <span className="detail-label">Purchased:</span>
              <span className="detail-value">
                {new Date(currentPackage.purchased_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {currentPackage.is_semi_private && (
              <div className="package-detail-item">
                <span className="detail-label">Type:</span>
                <span className="detail-value">Semi-Private</span>
              </div>
            )}
            {currentPackage.notes && (
              <div className="package-detail-item full-width">
                <span className="detail-label">Notes:</span>
                <span className="detail-value">{currentPackage.notes}</span>
              </div>
            )}
          </div>
          {/* Progress Bar */}
          <div className="package-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${(currentPackage.lessons_used / currentPackage.lessons_purchased) * 100}%` 
                }}
              />
            </div>
            <div className="progress-text">
              {currentPackage.lessons_used} of {currentPackage.lessons_purchased} lessons used
            </div>
          </div>
        </div>
      )}

      {/* Package History List */}
      <div className="package-history-list">
        <h3>📚 Package History</h3>
        <div className="packages-table">
          <div className="packages-table-header">
            <div className="table-col date">Date</div>
            <div className="table-col size">Size</div>
            <div className="table-col price">Price</div>
            <div className="table-col used">Used</div>
            <div className="table-col remaining">Remaining</div>
            <div className="table-col status">Status</div>
          </div>
          {packages.map(pkg => (
            <div 
              key={pkg.id} 
              className={`packages-table-row ${pkg.id === currentPackage?.id ? 'current' : ''} ${!pkg.is_active ? 'completed' : ''}`}
            >
              <div className="table-col date">
                {new Date(pkg.purchased_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
              <div className="table-col size">
                {pkg.package_size} {pkg.is_semi_private && '(Semi-Private)'}
              </div>
              <div className="table-col price">
                ${pkg.price_paid.toFixed(2)}
                <div className="price-per-lesson">${pkg.price_per_lesson.toFixed(2)}/lesson</div>
              </div>
              <div className="table-col used">{pkg.lessons_used}</div>
              <div className="table-col remaining">
                <strong>{pkg.lessons_remaining}</strong>
              </div>
              <div className="table-col status">
                {pkg.id === currentPackage?.id ? (
                  <span className="status-badge active">Active</span>
                ) : pkg.is_active ? (
                  <span className="status-badge pending">Pending</span>
                ) : (
                  <span className="status-badge completed">Completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
