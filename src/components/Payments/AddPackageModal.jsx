import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import './AddPackageModal.css'

export default function AddPackageModal({ student, onClose, onSuccess }) {
  const [packageSize, setPackageSize] = useState(5)
  const [amount, setAmount] = useState(350)
  const [paymentMethod, setPaymentMethod] = useState('Venmo')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const packageOptions = [
    { lessons: 5, defaultPrice: 350, pricePerLesson: 70 },
    { lessons: 10, defaultPrice: 650, pricePerLesson: 65 },
    { lessons: 20, defaultPrice: 1200, pricePerLesson: 60 }
  ]

  const handlePackageChange = (lessons) => {
    setPackageSize(lessons)
    const pkg = packageOptions.find(p => p.lessons === lessons)
    setAmount(pkg.defaultPrice)
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
            notes: notes || `${packageSize}-lesson package purchased`
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
                  <div className="package-lessons">{pkg.lessons} Lessons</div>
                  <div className="package-price">${pkg.defaultPrice}</div>
                  <div className="package-per-lesson">${pkg.pricePerLesson}/lesson</div>
                </button>
              ))}
            </div>
          </div>

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
                className="package-input-amount"
              />
            </div>
            <p className="package-price-note">
              ${(amount / packageSize).toFixed(2)} per lesson
            </p>
          </div>

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
              <option value="Other">Other</option>
            </select>
          </div>

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

          <div className="package-summary-box">
            <h4>✓ Summary</h4>
            <div className="summary-row">
              <span>Package:</span>
              <span>{packageSize} lessons</span>
            </div>
            <div className="summary-row">
              <span>Amount:</span>
              <span>${parseFloat(amount).toFixed(2)}</span>
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

