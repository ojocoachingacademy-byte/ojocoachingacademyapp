import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import './AddPackageModal.css'

// Pricing structures
const existingStudentPackages = [
  { lessons: 1, price: 70 },
  { lessons: 5, price: 325 },
  { lessons: 10, price: 600 },
  { lessons: 20, price: 1000 }
]

const newStudentPackages = [
  { lessons: 1, price: 100 },
  { lessons: 5, price: 450 },
  { lessons: 20, price: 1400 }
]

export default function AddPackageModal({ student, onClose, onSuccess }) {
  const [studentType, setStudentType] = useState('existing')
  const [packageSize, setPackageSize] = useState(5)
  const [amount, setAmount] = useState(325)
  const [useCustomPricing, setUseCustomPricing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Venmo')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const packageOptions = studentType === 'existing' ? existingStudentPackages : newStudentPackages

  const handleStudentTypeChange = (type) => {
    setStudentType(type)
    const packages = type === 'existing' ? existingStudentPackages : newStudentPackages
    // Find the current package size in new pricing, or default to first option
    let pkg = packages.find(p => p.lessons === packageSize)
    if (!pkg) {
      pkg = packages[0]
      setPackageSize(pkg.lessons)
    }
    if (!useCustomPricing) {
      setAmount(pkg.price)
    }
  }

  const handlePackageChange = (lessons) => {
    setPackageSize(lessons)
    if (!useCustomPricing) {
      const pkg = packageOptions.find(p => p.lessons === lessons)
      if (pkg) setAmount(pkg.price)
    }
  }

  const handleAddPackage = async () => {
    setProcessing(true)
    try {
      // 1. Add credits to student
      const newCredits = (student.lesson_credits || 0) + packageSize
      const newTotalRevenue = (student.total_revenue || 0) + parseFloat(amount)
      const newTotalPurchased = (student.total_lessons_purchased || 0) + packageSize

      const { error: updateError } = await supabase
        .from('students')
        .update({ 
          lesson_credits: newCredits,
          total_revenue: newTotalRevenue,
          total_lessons_purchased: newTotalPurchased
        })
        .eq('id', student.id)

      if (updateError) throw updateError

      // 2. Try to record transaction (table may not exist yet)
      try {
        await supabase
          .from('payment_transactions')
          .insert({
            student_id: student.id,
            amount: parseFloat(amount),
            lesson_credits: packageSize,
            payment_method: paymentMethod,
            notes: notes || `${packageSize}-lesson package (${studentType} student rate)`
          })
      } catch (txError) {
        console.log('Transaction logging skipped (table may not exist):', txError)
      }

      alert(`Package added! ${student.profiles?.full_name || 'Student'} now has ${newCredits} credits.`)
      onSuccess()
      onClose()

    } catch (error) {
      console.error('Error adding package:', error)
      alert('Error adding package: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const currentCredits = student.lesson_credits || 0

  return (
    <div className="package-modal-overlay" onClick={onClose}>
      <div className="package-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="package-modal-header">
          <h2>💳 Add Lesson Package</h2>
          <button onClick={onClose} className="package-btn-close">×</button>
        </div>

        <div className="package-modal-body">
          <div className="package-student-info">
            <p className="student-name">{student.profiles?.full_name || 'Unknown Student'}</p>
            <p className="current-credits">Current Credits: <strong>{currentCredits}</strong></p>
          </div>

          {/* Student Type Toggle */}
          <div className="package-form-group">
            <label>Student Type</label>
            <div className="student-type-toggle">
              <button
                type="button"
                onClick={() => handleStudentTypeChange('existing')}
                className={`toggle-btn ${studentType === 'existing' ? 'active' : ''}`}
              >
                Existing Student
              </button>
              <button
                type="button"
                onClick={() => handleStudentTypeChange('new')}
                className={`toggle-btn ${studentType === 'new' ? 'active' : ''}`}
              >
                New Student
              </button>
            </div>
          </div>

          {/* Package Selection */}
          <div className="package-form-group">
            <label>Select Package</label>
            <div className="package-buttons">
              {packageOptions.map(pkg => (
                <button
                  key={pkg.lessons}
                  type="button"
                  onClick={() => handlePackageChange(pkg.lessons)}
                  className={`package-option-btn ${packageSize === pkg.lessons ? 'selected' : ''}`}
                >
                  <div className="package-lessons">{pkg.lessons} {pkg.lessons === 1 ? 'Lesson' : 'Lessons'}</div>
                  <div className="package-price">${pkg.price}</div>
                  <div className="package-per-lesson">${(pkg.price / pkg.lessons).toFixed(2)}/lesson</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Pricing Toggle */}
          <div className="package-form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useCustomPricing}
                onChange={(e) => setUseCustomPricing(e.target.checked)}
              />
              <span>Use Custom Pricing (gift cards, special deals, etc.)</span>
            </label>
          </div>

          {/* Amount */}
          <div className="package-form-group">
            <label>Amount Paid</label>
            <div className="amount-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                step="0.01"
                min="0"
                className={`package-input-amount ${!useCustomPricing ? 'disabled' : ''}`}
                disabled={!useCustomPricing}
              />
            </div>
            {!useCustomPricing ? (
              <p className="package-price-note">
                Using {studentType === 'existing' ? 'existing' : 'new'} student pricing
              </p>
            ) : (
              <p className="package-price-note custom">
                ${(amount / packageSize).toFixed(2)} per lesson (custom)
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="package-form-group">
            <label>Payment Method</label>
            <select 
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="package-input-select"
            >
              <option value="Venmo">Venmo</option>
              <option value="Zelle">Zelle</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Card">Credit/Debit Card</option>
              <option value="Gift Card">Gift Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div className="package-form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this payment..."
              rows={3}
              className="package-input-textarea"
            />
          </div>

          {/* Summary */}
          <div className="package-summary-box">
            <h4>✓ Summary</h4>
            <div className="summary-row">
              <span>Student Type:</span>
              <span>{studentType === 'existing' ? 'Existing' : 'New'}</span>
            </div>
            <div className="summary-row">
              <span>Package:</span>
              <span>{packageSize} {packageSize === 1 ? 'lesson' : 'lessons'}</span>
            </div>
            <div className="summary-row">
              <span>Amount:</span>
              <span>${parseFloat(amount).toFixed(2)}{useCustomPricing ? ' (custom)' : ''}</span>
            </div>
            <div className="summary-row">
              <span>Per Lesson:</span>
              <span>${(amount / packageSize).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Payment:</span>
              <span>{paymentMethod}</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>New Credit Balance:</span>
              <span>{currentCredits + packageSize} credits</span>
            </div>
          </div>
        </div>

        <div className="package-modal-footer">
          <button onClick={onClose} className="package-btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleAddPackage}
            disabled={processing || !amount}
            className="package-btn-primary"
          >
            {processing ? '⏳ Processing...' : '✓ Add Package'}
          </button>
        </div>
      </div>
    </div>
  )
}
