import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { X, UserPlus, XCircle } from 'lucide-react'
import './LogPaymentModal.css'

const PACKAGE_OPTIONS = [
  { value: 1, label: '1 Lesson' },
  { value: 5, label: '5 Lesson Package' },
  { value: 10, label: '10 Lesson Package' },
  { value: 20, label: '20 Lesson Package' }
]

const PAYMENT_METHODS = ['Stripe', 'Cash', 'Venmo', 'Zelle']

export default function LogPaymentModal({ onClose, onSuccess }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [studentId1, setStudentId1] = useState('')
  const [studentId2, setStudentId2] = useState(null)
  const [showSecondStudent, setShowSecondStudent] = useState(false)
  const [amount, setAmount] = useState('')
  const [packageSize, setPackageSize] = useState(5)
  const [paymentMethod, setPaymentMethod] = useState('Venmo')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  
  // Errors
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      // Fetch active students
      const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, is_active')
        .eq('is_active', true)
        .order('id')

      if (studentsError) throw studentsError

      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id)
        const { data: profilesData, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds)

        if (profilesError) throw profilesError

        // Merge students with profiles
        const studentsWithProfiles = studentsData.map(student => {
          const profile = (profilesData || []).find(p => p.id === student.id)
          return {
            id: student.id,
            name: profile?.full_name || 'Unknown Student',
            email: profile?.email || ''
          }
        })

        setStudents(studentsWithProfiles)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching students:', error)
      alert('Error loading students: ' + error.message)
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!studentId1) {
      newErrors.studentId1 = 'Please select a student'
    }

    if (showSecondStudent && studentId2 && studentId1 === studentId2) {
      newErrors.studentId2 = 'Cannot select the same student twice'
    }

    const amountValue = parseFloat(amount)
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    }

    if (!packageSize) {
      newErrors.packageSize = 'Please select a package type'
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method'
    }

    if (!paymentDate) {
      newErrors.paymentDate = 'Please select a payment date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const amountValue = parseFloat(amount)
      
      // Validate amount is a valid number
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Invalid amount. Please enter a positive number.')
      }
      
      const isSemiPrivate = showSecondStudent && studentId2
      
      // Validate studentId1 exists
      if (!studentId1) {
        throw new Error('Please select a student.')
      }
      
      // Validate studentId2 if semi-private
      if (isSemiPrivate && !studentId2) {
        throw new Error('Please select a second student for semi-private payment.')
      }
      
      // Calculate amount per student (split for semi-private)
      const amountPerStudent = isSemiPrivate ? amountValue / 2 : amountValue
      
      // Validate package size
      if (!packageSize || packageSize <= 0 || isNaN(packageSize)) {
        throw new Error('Invalid package size.')
      }

      // Get student names for notes
      const student1 = students.find(s => s.id === studentId1)
      if (!student1) {
        throw new Error('Selected student not found.')
      }
      
      const student2 = isSemiPrivate && studentId2 ? students.find(s => s.id === studentId2) : null
      if (isSemiPrivate && !student2) {
        throw new Error('Second student not found.')
      }
      
      // Create transaction(s)
      const transactions = []
      
      // Build notes with payment method included
      const buildNotes = (semiPrivateNote) => {
        const parts = []
        if (semiPrivateNote) parts.push(semiPrivateNote)
        parts.push(`Payment method: ${paymentMethod}`)
        if (notes) parts.push(notes)
        return parts.join('. ').trim()
      }

      // Ensure paymentDate is a valid date string (YYYY-MM-DD format)
      const validPaymentDate = paymentDate || new Date().toISOString().split('T')[0]
      
      // Transaction for first student
      const transaction1 = {
        student_id: studentId1,
        amount_paid: parseFloat(amountPerStudent.toFixed(2)), // Ensure proper decimal precision
        package_size: parseInt(packageSize, 10), // Ensure integer
        transaction_date: validPaymentDate,
        transaction_type: 'package_purchase',
        notes: isSemiPrivate 
          ? buildNotes(`Semi-private payment with ${student2?.name || 'Unknown'}`)
          : buildNotes(null)
      }
      transactions.push(transaction1)

      // Transaction for second student if semi-private
      if (isSemiPrivate && studentId2) {
        const transaction2 = {
          student_id: studentId2,
          amount_paid: parseFloat(amountPerStudent.toFixed(2)), // Ensure proper decimal precision
          package_size: parseInt(packageSize, 10), // Ensure integer
          transaction_date: validPaymentDate,
          transaction_type: 'package_purchase',
          notes: buildNotes(`Semi-private payment with ${student1?.name || 'Unknown'}`)
        }
        transactions.push(transaction2)
      }

      // Insert transactions
      console.log('Inserting transactions:', transactions)
      const { data: insertedTransactions, error: transactionError } = await supabaseAdmin
        .from('lesson_transactions')
        .insert(transactions)
        .select()

      if (transactionError) {
        console.error('Transaction insert error:', transactionError)
        console.error('Transaction data attempted:', JSON.stringify(transactions, null, 2))
        throw transactionError
      }
      
      console.log('Transactions inserted successfully:', insertedTransactions)

      // Update credits for each student (both get FULL package credits)
      const studentsToUpdate = [studentId1]
      if (isSemiPrivate) {
        studentsToUpdate.push(studentId2)
      }

      for (const studentId of studentsToUpdate) {
        console.log(`Updating student ${studentId}...`)
        
        // Get current credits
        const { data: studentData, error: fetchError } = await supabaseAdmin
          .from('students')
          .select('lesson_credits')
          .eq('id', studentId)
          .single()

        if (fetchError) {
          console.error(`Error fetching student ${studentId}:`, fetchError)
          throw fetchError
        }

        if (!studentData) {
          throw new Error(`Student ${studentId} not found`)
        }

        const currentCredits = studentData.lesson_credits || 0
        const newCredits = currentCredits + packageSize
        console.log(`Student ${studentId}: Credits ${currentCredits} -> ${newCredits}`)

        // Update credits
        const { error: updateError } = await supabaseAdmin
          .from('students')
          .update({ lesson_credits: newCredits })
          .eq('id', studentId)

        if (updateError) {
          console.error(`Error updating credits for student ${studentId}:`, updateError)
          throw updateError
        }

        // Also update total_revenue and total_lessons_purchased in students table
        // This ensures the financial tab stays in sync with transaction records
        const { data: studentFinancial, error: financialFetchError } = await supabaseAdmin
          .from('students')
          .select('total_revenue, total_lessons_purchased')
          .eq('id', studentId)
          .single()

        if (financialFetchError) {
          console.warn(`Error fetching financial data for student ${studentId}:`, financialFetchError)
        } else if (studentFinancial) {
          const newRevenue = (studentFinancial.total_revenue || 0) + amountPerStudent
          const newPurchased = (studentFinancial.total_lessons_purchased || 0) + packageSize
          
          console.log(`Student ${studentId} financial: Revenue ${studentFinancial.total_revenue || 0} -> ${newRevenue}, Purchased ${studentFinancial.total_lessons_purchased || 0} -> ${newPurchased}`)

          const { error: updateFinancialError } = await supabaseAdmin
            .from('students')
            .update({
              total_revenue: newRevenue,
              total_lessons_purchased: newPurchased
            })
            .eq('id', studentId)

          if (updateFinancialError) {
            console.warn(`Error updating financial stats for student ${studentId}:`, updateFinancialError)
            // Don't fail the whole operation if financial update fails
          } else {
            console.log(`Financial stats updated successfully for student ${studentId}`)
          }
        }
      }

      // Success message
      const studentNames = isSemiPrivate 
        ? `${student1.name} and ${student2?.name || 'Student 2'}`
        : student1.name
      
      const totalAmount = isSemiPrivate ? amountValue : amountPerStudent
      const amountPerStudentFormatted = isSemiPrivate ? amountPerStudent : amountValue
      
      const successMessage = isSemiPrivate
        ? `Payment logged successfully!\n\n${studentNames} paid $${totalAmount.toFixed(2)} total ($${amountPerStudentFormatted.toFixed(2)} each).\n${packageSize} credits added to each student.`
        : `Payment logged successfully!\n\n${studentNames} paid $${totalAmount.toFixed(2)}.\n${packageSize} credit${packageSize !== 1 ? 's' : ''} added.`
      
      alert(successMessage)
      
      if (onSuccess) {
        onSuccess()
      }
      
      onClose()
    } catch (error) {
      console.error('Error logging payment:', error)
      alert('Error logging payment: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddSecondStudent = () => {
    setShowSecondStudent(true)
    setStudentId2('')
  }

  const handleRemoveSecondStudent = () => {
    setShowSecondStudent(false)
    setStudentId2(null)
    setErrors({ ...errors, studentId2: null })
  }

  if (loading) {
    return (
      <div className="log-payment-modal-overlay" onClick={onClose}>
        <div className="log-payment-modal-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading students...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="log-payment-modal-overlay" onClick={onClose}>
      <div className="log-payment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="log-payment-modal-header">
          <h2>💳 Log Payment</h2>
          <button onClick={onClose} className="log-payment-btn-close">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="log-payment-form">
          <div className="log-payment-modal-body">
            {/* Student Selection 1 */}
            <div className="log-payment-form-group">
              <label>
                Student <span className="required">*</span>
              </label>
              <select
                value={studentId1}
                onChange={(e) => {
                  setStudentId1(e.target.value)
                  setErrors({ ...errors, studentId1: null })
                }}
                className={`log-payment-input ${errors.studentId1 ? 'error' : ''}`}
                required
              >
                <option value="">Select a student...</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.email ? `(${student.email})` : ''}
                  </option>
                ))}
              </select>
              {errors.studentId1 && (
                <span className="error-message">{errors.studentId1}</span>
              )}
            </div>

            {/* Add Second Student Button */}
            {!showSecondStudent && (
              <div className="log-payment-form-group">
                <button
                  type="button"
                  onClick={handleAddSecondStudent}
                  className="log-payment-btn-add-student"
                >
                  <UserPlus size={18} />
                  Add 2nd Student (Semi-Private)
                </button>
              </div>
            )}

            {/* Student Selection 2 (Semi-Private) */}
            {showSecondStudent && (
              <div className="log-payment-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>
                    2nd Student (Semi-Private) <span className="optional">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveSecondStudent}
                    className="log-payment-btn-remove"
                    title="Remove second student"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
                <select
                  value={studentId2 || ''}
                  onChange={(e) => {
                    setStudentId2(e.target.value || null)
                    setErrors({ ...errors, studentId2: null })
                  }}
                  className={`log-payment-input ${errors.studentId2 ? 'error' : ''}`}
                >
                  <option value="">Select second student (optional)...</option>
                  {students
                    .filter(s => s.id !== studentId1)
                    .map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} {student.email ? `(${student.email})` : ''}
                      </option>
                    ))}
                </select>
                {errors.studentId2 && (
                  <span className="error-message">{errors.studentId2}</span>
                )}
                <p className="form-help-text">
                  Amount will be split 50/50, but both students receive full package credits.
                </p>
              </div>
            )}

            {/* Amount */}
            <div className="log-payment-form-group">
              <label>
                Amount Paid <span className="required">*</span>
              </label>
              <div className="amount-input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setErrors({ ...errors, amount: null })
                  }}
                  className={`log-payment-input ${errors.amount ? 'error' : ''}`}
                  placeholder="0.00"
                  required
                />
              </div>
              {errors.amount && (
                <span className="error-message">{errors.amount}</span>
              )}
              {showSecondStudent && studentId2 && amount && (
                <p className="form-help-text">
                  Each student will be charged: ${(parseFloat(amount) / 2).toFixed(2)}
                </p>
              )}
            </div>

            {/* Package Type */}
            <div className="log-payment-form-group">
              <label>
                Package Type <span className="required">*</span>
              </label>
              <select
                value={packageSize}
                onChange={(e) => {
                  setPackageSize(parseInt(e.target.value))
                  setErrors({ ...errors, packageSize: null })
                }}
                className={`log-payment-input ${errors.packageSize ? 'error' : ''}`}
                required
              >
                {PACKAGE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.packageSize && (
                <span className="error-message">{errors.packageSize}</span>
              )}
              <p className="form-help-text">
                {packageSize} credit{packageSize !== 1 ? 's' : ''} will be added to {showSecondStudent && studentId2 ? 'each student' : 'the student'}.
              </p>
            </div>

            {/* Payment Method */}
            <div className="log-payment-form-group">
              <label>
                Payment Method <span className="required">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value)
                  setErrors({ ...errors, paymentMethod: null })
                }}
                className={`log-payment-input ${errors.paymentMethod ? 'error' : ''}`}
                required
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              {errors.paymentMethod && (
                <span className="error-message">{errors.paymentMethod}</span>
              )}
            </div>

            {/* Payment Date */}
            <div className="log-payment-form-group">
              <label>
                Payment Date <span className="required">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value)
                  setErrors({ ...errors, paymentDate: null })
                }}
                className={`log-payment-input ${errors.paymentDate ? 'error' : ''}`}
                required
              />
              {errors.paymentDate && (
                <span className="error-message">{errors.paymentDate}</span>
              )}
            </div>

            {/* Notes (Optional) */}
            <div className="log-payment-form-group">
              <label>
                Notes <span className="optional">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this payment..."
                rows={3}
                className="log-payment-input"
              />
            </div>

            {/* Summary */}
            <div className="log-payment-summary">
              <h4>Summary</h4>
              <div className="summary-row">
                <span>Student(s):</span>
                <span>
                  {studentId1 ? students.find(s => s.id === studentId1)?.name || 'N/A' : 'Not selected'}
                  {showSecondStudent && studentId2 && `, ${students.find(s => s.id === studentId2)?.name || 'N/A'}`}
                </span>
              </div>
              <div className="summary-row">
                <span>Amount:</span>
                <span>${amount ? parseFloat(amount).toFixed(2) : '0.00'}</span>
              </div>
              {showSecondStudent && studentId2 && amount && (
                <div className="summary-row">
                  <span>Amount per student:</span>
                  <span>${(parseFloat(amount) / 2).toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Package:</span>
                <span>{packageSize} lesson{packageSize !== 1 ? 's' : ''}</span>
              </div>
              <div className="summary-row">
                <span>Credits per student:</span>
                <span>{packageSize}</span>
              </div>
              <div className="summary-row">
                <span>Payment Method:</span>
                <span>{paymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="log-payment-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="log-payment-btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="log-payment-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Logging Payment...' : 'Log Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
