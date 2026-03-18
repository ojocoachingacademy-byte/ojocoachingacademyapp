import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { syncLessonCreditsCache } from '../../utils/creditUtils'
import { Edit2, Save, X } from 'lucide-react'
import './PackageHistory.css'

export default function PackageHistory({ studentId }) {
  const [packages, setPackages] = useState([])
  const [currentPackage, setCurrentPackage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

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

  const startEdit = (pkg) => {
    setEditingId(pkg.id)
    setEditForm({
      purchased_date: pkg.purchased_date?.split('T')[0] || '',
      package_size: pkg.package_size ?? 0,
      price_paid: pkg.price_paid ?? 0,
      lessons_used: pkg.lessons_used ?? 0,
      notes: pkg.notes || ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const size = Math.max(1, parseInt(editForm.package_size, 10) || 1)
      const pricePaid = parseFloat(editForm.price_paid) || 0
      const lessonsUsed = Math.min(size, Math.max(0, parseInt(editForm.lessons_used, 10) || 0))
      const pricePerLesson = size > 0 ? pricePaid / size : 0

      const { error } = await supabaseAdmin
        .from('student_packages')
        .update({
          purchased_date: editForm.purchased_date || new Date().toISOString().split('T')[0],
          package_size: size,
          price_paid: pricePaid,
          price_per_lesson: pricePerLesson,
          lessons_purchased: size,
          lessons_used: lessonsUsed,
          notes: editForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId)

      if (error) throw error
      setEditingId(null)
      await syncLessonCreditsCache(studentId, supabaseAdmin)
      await fetchPackages()
    } catch (err) {
      console.error('Error saving package:', err)
      alert('Failed to save: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (pkgId, newStatus) => {
    setSaving(true)
    try {
      if (newStatus === 'active') {
        await supabaseAdmin.from('students').update({ current_package_id: pkgId }).eq('id', studentId)
        await supabaseAdmin
          .from('student_packages')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', pkgId)
      } else if (newStatus === 'pending') {
        const pkg = packages.find(p => p.id === pkgId)
        if (pkg?.id === currentPackage?.id) {
          await supabaseAdmin.from('students').update({ current_package_id: null }).eq('id', studentId)
        }
        await supabaseAdmin
          .from('student_packages')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', pkgId)
      } else {
        // completed
        const pkg = packages.find(p => p.id === pkgId)
        if (pkg?.id === currentPackage?.id) {
          await supabaseAdmin.from('students').update({ current_package_id: null }).eq('id', studentId)
        }
        await supabaseAdmin
          .from('student_packages')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', pkgId)
      }
      await syncLessonCreditsCache(studentId, supabaseAdmin)
      await fetchPackages()
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const getDisplayStatus = (pkg) => {
    if (pkg.id === currentPackage?.id) return 'active'
    if (pkg.is_active) return 'pending'
    return 'completed'
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
            <div className="current-package-actions">
              <select
                className="package-status-select"
                value="active"
                onChange={(e) => handleStatusChange(currentPackage.id, e.target.value)}
                disabled={saving}
                style={{ marginRight: '8px' }}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              {editingId === currentPackage.id ? (
                <div className="package-edit-actions" style={{ display: 'inline-flex' }}>
                  <button
                    type="button"
                    className="package-action-btn save"
                    onClick={saveEdit}
                    disabled={saving}
                    title="Save"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    type="button"
                    className="package-action-btn cancel"
                    onClick={cancelEdit}
                    disabled={saving}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="package-action-btn edit"
                  onClick={() => startEdit(currentPackage)}
                  title="Edit package"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="package-details-grid">
            {editingId === currentPackage.id ? (
              <>
                <div className="package-detail-item">
                  <span className="detail-label">Purchased Date:</span>
                  <input
                    type="date"
                    className="package-edit-input"
                    value={editForm.purchased_date}
                    onChange={e => setEditForm(f => ({ ...f, purchased_date: e.target.value }))}
                    style={{ maxWidth: '180px' }}
                  />
                </div>
                <div className="package-detail-item">
                  <span className="detail-label">Package Size:</span>
                  <input
                    type="number"
                    min="1"
                    className="package-edit-input"
                    value={editForm.package_size}
                    onChange={e => setEditForm(f => ({ ...f, package_size: e.target.value }))}
                    style={{ maxWidth: '80px' }}
                  />
                </div>
                <div className="package-detail-item">
                  <span className="detail-label">Price Paid:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="package-edit-input"
                    value={editForm.price_paid}
                    onChange={e => setEditForm(f => ({ ...f, price_paid: e.target.value }))}
                    style={{ maxWidth: '100px' }}
                  />
                </div>
                <div className="package-detail-item">
                  <span className="detail-label">Lessons Used:</span>
                  <input
                    type="number"
                    min="0"
                    max={editForm.package_size || currentPackage.package_size}
                    className="package-edit-input"
                    value={editForm.lessons_used}
                    onChange={e => setEditForm(f => ({ ...f, lessons_used: e.target.value }))}
                    style={{ maxWidth: '80px' }}
                  />
                </div>
                <div className="package-detail-item">
                  <span className="detail-label">Lessons Remaining:</span>
                  <span className="detail-value highlight">
                    {Math.max(0, (editForm.package_size || 0) - (editForm.lessons_used || 0))}
                  </span>
                </div>
                <div className="package-detail-item full-width">
                  <span className="detail-label">Notes:</span>
                  <input
                    type="text"
                    className="package-edit-input"
                    placeholder="Notes"
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          {/* Progress Bar - only when not editing */}
          {editingId !== currentPackage.id && (
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
          )}
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
            <div className="table-col notes">Notes</div>
            <div className="table-col actions">Actions</div>
          </div>
          {packages.map(pkg => {
            const isEditing = editingId === pkg.id
            const displayStatus = getDisplayStatus(pkg)
            return (
              <div
                key={pkg.id}
                className={`packages-table-row ${pkg.id === currentPackage?.id ? 'current' : ''} ${!pkg.is_active ? 'completed' : ''} ${isEditing ? 'editing' : ''}`}
              >
                <div className="table-col date">
                  {isEditing ? (
                    <input
                      type="date"
                      className="package-edit-input"
                      value={editForm.purchased_date}
                      onChange={e => setEditForm(f => ({ ...f, purchased_date: e.target.value }))}
                    />
                  ) : (
                    new Date(pkg.purchased_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  )}
                </div>
                <div className="table-col size">
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      className="package-edit-input"
                      value={editForm.package_size}
                      onChange={e => setEditForm(f => ({ ...f, package_size: e.target.value }))}
                    />
                  ) : (
                    <>
                      {pkg.package_size} {pkg.is_semi_private && '(Semi-Private)'}
                    </>
                  )}
                </div>
                <div className="table-col price">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="package-edit-input"
                      value={editForm.price_paid}
                      onChange={e => setEditForm(f => ({ ...f, price_paid: e.target.value }))}
                    />
                  ) : (
                    <>
                      ${pkg.price_paid.toFixed(2)}
                      <div className="price-per-lesson">${pkg.price_per_lesson.toFixed(2)}/lesson</div>
                    </>
                  )}
                </div>
                <div className="table-col used">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max={editForm.package_size || pkg.package_size}
                      className="package-edit-input"
                      value={editForm.lessons_used}
                      onChange={e => setEditForm(f => ({ ...f, lessons_used: e.target.value }))}
                    />
                  ) : (
                    pkg.lessons_used
                  )}
                </div>
                <div className="table-col remaining">
                  {isEditing ? (
                    <strong>{Math.max(0, (editForm.package_size || 0) - (editForm.lessons_used || 0))}</strong>
                  ) : (
                    <strong>{pkg.lessons_remaining}</strong>
                  )}
                </div>
                <div className="table-col status">
                  <select
                    className="package-status-select"
                    value={displayStatus}
                    onChange={e => handleStatusChange(pkg.id, e.target.value)}
                    disabled={saving}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="table-col notes">
                  {isEditing ? (
                    <input
                      type="text"
                      className="package-edit-input"
                      placeholder="Notes"
                      value={editForm.notes}
                      onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  ) : (
                    pkg.notes ? (
                      <span className="package-notes-preview" title={pkg.notes}>
                        {pkg.notes.length > 20 ? pkg.notes.slice(0, 20) + '…' : pkg.notes}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )
                  )}
                </div>
                <div className="table-col actions">
                  {isEditing ? (
                    <div className="package-edit-actions">
                      <button
                        type="button"
                        className="package-action-btn save"
                        onClick={saveEdit}
                        disabled={saving}
                        title="Save"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        type="button"
                        className="package-action-btn cancel"
                        onClick={cancelEdit}
                        disabled={saving}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="package-action-btn edit"
                      onClick={() => startEdit(pkg)}
                      title="Edit package"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
