import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { X, UserPlus, XCircle } from 'lucide-react'
import './LogPaymentModal.css'

const PAYMENT_METHODS = ['Stripe', 'Cash', 'Venmo', 'Zelle', 'Zelle', 'Check', 'Card', 'Gift Card', 'Other']

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
  const [numPeople, setNumPeople] = useState(1) // 1 = individual, 2 = semi-private
  const [paymentMethod, setPaymentMethod] = useState('Venmo')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [useCustomPricing, setUseCustomPricing] = useState(false)
  
  // Pricing state
  const [packagePrices, setPackagePrices] = useState([])
  const [pricingTier, setPricingTier] = useState(null)
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [selectedPackagePrice, setSelectedPackagePrice] = useState(null)
  const [isCustomPrice, setIsCustomPrice] = useState(false)
  
  // Errors
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchStudents()
  }, [])

  // Fetch pricing when student is selected
  useEffect(() => {
    if (studentId1) {
      fetchPricingForStudent(studentId1)
    } else {
      setPackagePrices([])
      setPricingTier(null)
    }
  }, [studentId1])

  const fetchPricingForStudent = async (studentId) => {
    try {
      setLoadingPricing(true)
      
      // Get student's pricing tier
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('pricing_tier_id')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      const tierId = studentData?.pricing_tier_id

      if (!tierId) {
        // Default to legacy if no tier assigned
        const { data: legacyTier } = await supabaseAdmin
          .from('package_tiers')
          .select('id, tier_name, display_name')
          .eq('tier_name', 'legacy')
          .single()
        
        if (legacyTier) {
          setPricingTier(legacyTier)
          await fetchPackagePrices(legacyTier.id)
        }
        return
      }

      // Get tier info
      const { data: tierData, error: tierError } = await supabaseAdmin
        .from('package_tiers')
        .select('id, tier_name, display_name')
        .eq('id', tierId)
        .single()

      if (tierError) throw tierError
      setPricingTier(tierData)

      // Fetch package prices for this tier
      await fetchPackagePrices(tierId)
    } catch (error) {
      console.error('Error fetching pricing:', error)
      // Fallback to empty - allow custom pricing
      setPackagePrices([])
      setPricingTier(null)
    } finally {
      setLoadingPricing(false)
    }
  }

  const fetchPackagePrices = async (tierId) => {
    const { data, error } = await supabaseAdmin
      .from('package_prices')
      .select('package_size, num_people, price')
      .eq('tier_id', tierId)
      .order('num_people', { ascending: true })
      .order('package_size', { ascending: true })

    if (error) throw error
    setPackagePrices(data || [])
    
    // Set default package and amount based on numPeople
    if (data && data.length > 0) {
      const defaultPkg = data.find(p => p.package_size === 5 && p.num_people === numPeople) || 
                        data.find(p => p.num_people === numPeople) || 
                        data[0]
      if (defaultPkg) {
        setPackageSize(defaultPkg.package_size)
        setSelectedPackagePrice(defaultPkg.price)
        if (!isCustomPrice && !amount) {
          setAmount(defaultPkg.price.toString())
        }
      }
    }
  }

  const handlePackageSizeChange = (newSize) => {
    setPackageSize(newSize)
    
    if (!isCustomPrice && packagePrices.length > 0) {
      const matchingPackage = packagePrices.find(
        p => p.package_size === parseInt(newSize) && p.num_people === numPeople
      )
      if (matchingPackage) {
        setSelectedPackagePrice(matchingPackage.price)
        setAmount(matchingPackage.price.toString())
      }
    }
  }

  const handleNumPeopleChange = (newNumPeople) => {
    setNumPeople(newNumPeople)
    setShowSecondStudent(newNumPeople === 2)
    if (newNumPeople === 1) {
      setStudentId2(null)
    }
    
    if (!isCustomPrice && packagePrices.length > 0) {
      const matchingPackage = packagePrices.find(
        p => p.package_size === packageSize && p.num_people === newNumPeople
      )
      if (matchingPackage) {
        setSelectedPackagePrice(matchingPackage.price)
        setAmount(matchingPackage.price.toString())
      } else {
        // No pricing for this combination - enable custom
        setIsCustomPrice(true)
      }
    }
  }

  // Update pricing when numPeople changes
  useEffect(() => {
    if (studentId1 && pricingTier) {
      fetchPackagePrices(pricingTier.id)
    }
  }, [numPeople])

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

    if (numPeople === 2) {
      if (!studentId2) {
        newErrors.studentId2 = 'Please select a second student for semi-private payment'
      } else if (studentId1 === studentId2) {
        newErrors.studentId2 = 'Cannot select the same student twice'
      }
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
      
      const isSemiPrivate = numPeople === 2 && studentId2
      
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
      
      // Also create payment_transactions records for historical tracking (if table exists)
      try {
        const transactions = []
        const transaction1 = {
          student_id: studentId1,
          amount: parseFloat(amountPerStudent.toFixed(2)),
          lesson_credits: packageSize,
          payment_method: paymentMethod,
          payment_date: validPaymentDate,
          notes: isSemiPrivate 
            ? buildNotes(`Semi-private payment with ${student2?.name || 'Unknown'}`)
            : buildNotes(null)
        }
        transactions.push(transaction1)

        if (isSemiPrivate && studentId2) {
          const transaction2 = {
            student_id: studentId2,
            amount: parseFloat(amountPerStudent.toFixed(2)),
            lesson_credits: packageSize,
            payment_method: paymentMethod,
            payment_date: validPaymentDate,
            notes: buildNotes(`Semi-private payment with ${student1?.name || 'Unknown'}`)
          }
          transactions.push(transaction2)
        }

        await supabaseAdmin
          .from('payment_transactions')
          .insert(transactions)
      } catch (txError) {
        console.log('Transaction logging skipped (table may not exist):', txError)
        // Don't fail the whole operation if transaction logging fails
      }

      // Create student_packages records and update credits for each student
      const studentsToUpdate = [studentId1]
      if (isSemiPrivate) {
        studentsToUpdate.push(studentId2)
      }

      for (const studentId of studentsToUpdate) {
        console.log(`Processing package for student ${studentId}...`)
        
        // Get current student data
        const { data: studentData, error: fetchError } = await supabaseAdmin
          .from('students')
          .select('lesson_credits, total_revenue, total_lessons_purchased')
          .eq('id', studentId)
          .single()

        if (fetchError) {
          console.error(`Error fetching student ${studentId}:`, fetchError)
          throw fetchError
        }

        if (!studentData) {
          throw new Error(`Student ${studentId} not found`)
        }

        const pricePaid = parseFloat(amountPerStudent.toFixed(2))
        const pricePerLesson = pricePaid / packageSize
        const purchasedDate = validPaymentDate

        // Create student_packages record
        const { data: newPackage, error: packageError } = await supabaseAdmin
          .from('student_packages')
          .insert({
            student_id: studentId,
            package_size: packageSize,
            price_paid: pricePaid,
            price_per_lesson: pricePerLesson,
            lessons_purchased: packageSize,
            lessons_used: 0,
            purchased_date: purchasedDate,
            is_active: true,
            is_semi_private: isSemiPrivate,
            semi_private_partner_id: isSemiPrivate && studentId === studentId1 ? studentId2 : (isSemiPrivate ? studentId1 : null),
            notes: isSemiPrivate 
              ? `Semi-private payment with ${studentId === studentId1 ? student2?.name : student1?.name}. ${buildNotes(null)}`
              : (isCustomPrice ? 'Custom pricing' : null) || buildNotes(null)
          })
          .select()
          .single()

        if (packageError) {
          console.error(`Error creating package for student ${studentId}:`, packageError)
          throw packageError
        }

        // Update student record
        const currentCredits = studentData.lesson_credits || 0
        const newCredits = currentCredits + packageSize
        const newRevenue = (studentData.total_revenue || 0) + pricePaid
        const newPurchased = (studentData.total_lessons_purchased || 0) + packageSize

        console.log(`Student ${studentId}: Credits ${currentCredits} -> ${newCredits}, Revenue ${studentData.total_revenue || 0} -> ${newRevenue}`)

        const { error: updateError } = await supabaseAdmin
          .from('students')
          .update({ 
            lesson_credits: newCredits,
            total_revenue: newRevenue,
            total_lessons_purchased: newPurchased,
            current_package_id: newPackage.id // Set as current package
          })
          .eq('id', studentId)

        if (updateError) {
          console.error(`Error updating student ${studentId}:`, updateError)
          throw updateError
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
    setNumPeople(2)
  }

  const handleRemoveSecondStudent = () => {
    setShowSecondStudent(false)
    setStudentId2(null)
    setNumPeople(1)
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
                  const newStudentId = e.target.value
                  setStudentId1(newStudentId)
                  setErrors({ ...errors, studentId1: null })
                  if (newStudentId) {
                    fetchPricingForStudent(newStudentId)
                  }
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

            {/* Student Selection 2 (Semi-Private) */}
            {numPeople === 2 && (
              <div className="log-payment-form-group">
                <label>
                  2nd Student (Semi-Private) <span className="required">*</span>
                </label>
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

            {/* Amount with Edit Button */}
            <div className="log-payment-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>
                  Amount Paid <span className="required">*</span>
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setIsCustomPrice(!isCustomPrice)}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                >
                  {isCustomPrice ? '🔒 Lock Price' : '✏️ Edit Price'}
                </button>
              </div>
              <div className="amount-input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setIsCustomPrice(true)
                    setErrors({ ...errors, amount: null })
                  }}
                  className={`log-payment-input ${errors.amount ? 'error' : ''}`}
                  placeholder="0.00"
                  disabled={!isCustomPrice && packagePrices.length > 0}
                  style={{
                    backgroundColor: isCustomPrice ? 'white' : '#f5f5f5',
                    cursor: isCustomPrice ? 'text' : 'not-allowed'
                  }}
                  required
                />
              </div>
              {errors.amount && (
                <span className="error-message">{errors.amount}</span>
              )}
              {!isCustomPrice && selectedPackagePrice && (
                <p className="form-help-text" style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Standard price: ${selectedPackagePrice.toFixed(2)} (${(selectedPackagePrice / packageSize).toFixed(2)}/lesson)
                </p>
              )}
              {isCustomPrice && amount && packageSize && (
                <p className="form-help-text" style={{ color: '#FF9800' }}>
                  ${(parseFloat(amount) / packageSize).toFixed(2)} per lesson (custom)
                </p>
              )}
              {numPeople === 2 && studentId2 && amount && (
                <p className="form-help-text">
                  Each student will be charged: ${(parseFloat(amount) / 2).toFixed(2)}
                </p>
              )}
            </div>

            {/* Pricing Tier Display */}
            {pricingTier && studentId1 && (
              <div className="log-payment-form-group">
                <label>Pricing Tier</label>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: 'var(--color-primary)'
                }}>
                  {pricingTier.display_name}
                </div>
              </div>
            )}

            {/* Individual vs Semi-Private Toggle */}
            <div className="log-payment-form-group">
              <label>Lesson Type <span className="required">*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleNumPeopleChange(1)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `2px solid ${numPeople === 1 ? 'var(--color-primary)' : '#ddd'}`,
                    borderRadius: '6px',
                    backgroundColor: numPeople === 1 ? '#F8F5FC' : 'white',
                    cursor: 'pointer',
                    fontWeight: numPeople === 1 ? '600' : '400'
                  }}
                >
                  Individual (1 person)
                </button>
                <button
                  type="button"
                  onClick={() => handleNumPeopleChange(2)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `2px solid ${numPeople === 2 ? 'var(--color-primary)' : '#ddd'}`,
                    borderRadius: '6px',
                    backgroundColor: numPeople === 2 ? '#F8F5FC' : 'white',
                    cursor: 'pointer',
                    fontWeight: numPeople === 2 ? '600' : '400'
                  }}
                >
                  Semi-Private (2 people)
                </button>
              </div>
            </div>

            {/* Package Size */}
            <div className="log-payment-form-group">
              <label>
                Package Size <span className="required">*</span>
              </label>
              {loadingPricing ? (
                <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>
                  Loading pricing...
                </div>
              ) : packagePrices.filter(p => p.num_people === numPeople).length === 0 ? (
                <div>
                  <input
                    type="number"
                    value={packageSize}
                    onChange={(e) => {
                      handlePackageSizeChange(parseInt(e.target.value) || 0)
                      setErrors({ ...errors, packageSize: null })
                    }}
                    className={`log-payment-input ${errors.packageSize ? 'error' : ''}`}
                    placeholder="Enter package size"
                    min="1"
                    required
                  />
                  <p className="form-help-text" style={{ color: '#999' }}>
                    No standard packages available. Enter custom package size.
                  </p>
                </div>
              ) : (
                <select
                  value={packageSize}
                  onChange={(e) => {
                    handlePackageSizeChange(parseInt(e.target.value))
                    setErrors({ ...errors, packageSize: null })
                  }}
                  className={`log-payment-input ${errors.packageSize ? 'error' : ''}`}
                  required
                >
                  {Array.from(new Set(packagePrices
                    .filter(p => p.num_people === numPeople)
                    .map(p => p.package_size)))
                    .map(size => (
                      <option key={size} value={size}>
                        {size} Lesson{size !== 1 ? 's' : ''}
                      </option>
                    ))}
                </select>
              )}
              {errors.packageSize && (
                <span className="error-message">{errors.packageSize}</span>
              )}
              <p className="form-help-text">
                {packageSize} credit{packageSize !== 1 ? 's' : ''} will be added to {numPeople === 2 && studentId2 ? 'each student' : 'the student'}.
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
              {pricingTier && (
                <div className="summary-row">
                  <span>Pricing Tier:</span>
                  <span>{pricingTier.display_name}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Lesson Type:</span>
                <span>{numPeople === 1 ? 'Individual' : 'Semi-Private (2 people)'}</span>
              </div>
              <div className="summary-row">
                <span>Student(s):</span>
                <span>
                  {studentId1 ? students.find(s => s.id === studentId1)?.name || 'N/A' : 'Not selected'}
                  {numPeople === 2 && studentId2 && `, ${students.find(s => s.id === studentId2)?.name || 'N/A'}`}
                </span>
              </div>
              <div className="summary-row">
                <span>Package:</span>
                <span>{packageSize} lesson{packageSize !== 1 ? 's' : ''}</span>
              </div>
              <div className="summary-row">
                <span>Amount:</span>
                <span>${amount ? parseFloat(amount).toFixed(2) : '0.00'}{useCustomPricing ? ' (custom)' : ''}</span>
              </div>
              {numPeople === 2 && studentId2 && amount && (
                <div className="summary-row">
                  <span>Amount per student:</span>
                  <span>${(parseFloat(amount) / 2).toFixed(2)}</span>
                </div>
              )}
              {amount && packageSize && (
                <div className="summary-row">
                  <span>Price per lesson:</span>
                  <span>${(parseFloat(amount) / packageSize).toFixed(2)}</span>
                </div>
              )}
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
