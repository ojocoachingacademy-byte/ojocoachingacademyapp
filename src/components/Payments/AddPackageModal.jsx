import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { supabaseAdmin } from '../../supabaseAdmin'
import './AddPackageModal.css'

export default function AddPackageModal({ student, onClose, onSuccess }) {
  const [packagePrices, setPackagePrices] = useState([])
  const [pricingTier, setPricingTier] = useState(null)
  const [packageSize, setPackageSize] = useState(5)
  const [numPeople, setNumPeople] = useState(1) // 1 = individual, 2 = semi-private
  const [amount, setAmount] = useState(0)
  const [useCustomPricing, setUseCustomPricing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Venmo')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creditsRemaining, setCreditsRemaining] = useState(0)

  // Fetch pricing based on student's pricing tier
  useEffect(() => {
    fetchPricing()
  }, [student])

  const fetchPricing = async () => {
    try {
      setLoading(true)
      if (!student?.id) {
        setLoading(false)
        return
      }

      // Credits remaining from active package (package-based)
      try {
        const { data: pkg } = await supabaseAdmin
          .from('student_packages')
          .select('*')
          .eq('student_id', student.id)
          .eq('is_active', true)
          .maybeSingle()
        if (pkg) {
          const { data: txList } = await supabaseAdmin
            .from('lesson_transactions')
            .select('credits_used')
            .eq('package_id', pkg.id)
          const used = txList?.reduce((sum, t) => sum + (t.credits_used || 0), 0) || 0
          setCreditsRemaining(pkg.total_credits - used)
        } else {
          setCreditsRemaining(0)
        }
      } catch (e) {
        setCreditsRemaining(0)
      }

      // Get student's pricing tier
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('pricing_tier_id')
        .eq('id', student.id)
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
      alert('Error loading pricing. Using default pricing.')
      // Fallback to hardcoded legacy pricing
      setPackagePrices([
        { package_size: 1, num_people: 1, price: 70 },
        { package_size: 5, num_people: 1, price: 325 },
        { package_size: 10, num_people: 1, price: 600 },
        { package_size: 20, num_people: 1, price: 1000 }
      ])
    } finally {
      setLoading(false)
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
    
    // Set default package and amount
    if (data && data.length > 0) {
      const defaultPkg = data.find(p => p.package_size === 5 && p.num_people === 1) || data[0]
      setPackageSize(defaultPkg.package_size)
      setNumPeople(defaultPkg.num_people)
      setAmount(defaultPkg.price)
    }
  }

  // Filter packages by number of people
  const packageOptions = packagePrices.filter(p => p.num_people === numPeople)

  const handleNumPeopleChange = (num) => {
    setNumPeople(num)
    // Find matching package size in new category, or default to first
    const newOptions = packagePrices.filter(p => p.num_people === num)
    const matchingPkg = newOptions.find(p => p.package_size === packageSize)
    if (matchingPkg && !useCustomPricing) {
      setAmount(matchingPkg.price)
    } else if (newOptions.length > 0 && !useCustomPricing) {
      const firstPkg = newOptions[0]
      setPackageSize(firstPkg.package_size)
      setAmount(firstPkg.price)
    }
  }

  const handlePackageChange = (size) => {
    setPackageSize(size)
    if (!useCustomPricing) {
      const pkg = packageOptions.find(p => p.package_size === size)
      if (pkg) setAmount(pkg.price)
    }
  }

  const handleAddPackage = async () => {
    setProcessing(true)
    try {
      const pricePaid = parseFloat(amount)
      const pricePerLesson = pricePaid / packageSize
      const purchasedDate = new Date().toISOString().split('T')[0]

      // 1. Create student_packages record
      const { data: newPackage, error: packageError } = await supabaseAdmin
        .from('student_packages')
        .insert({
          student_id: student.id,
          package_size: packageSize,
          price_paid: pricePaid,
          price_per_lesson: pricePerLesson,
          lessons_purchased: packageSize,
          lessons_used: 0,
          purchased_date: purchasedDate,
          is_active: true,
          is_semi_private: numPeople === 2,
          notes: notes || `${packageSize}-lesson package (${pricingTier?.display_name || 'standard'} pricing)`
        })
        .select()
        .single()

      if (packageError) throw packageError

      // 2. Update student record
      const newCredits = (student.lesson_credits || 0) + packageSize
      const newTotalRevenue = (student.total_revenue || 0) + pricePaid
      const newTotalPurchased = (student.total_lessons_purchased || 0) + packageSize

      const { error: updateError } = await supabaseAdmin
        .from('students')
        .update({ 
          lesson_credits: newCredits,
          total_revenue: newTotalRevenue,
          total_lessons_purchased: newTotalPurchased,
          current_package_id: newPackage.id // Set as current package
        })
        .eq('id', student.id)

      if (updateError) throw updateError

      // 3. Record transaction (if table exists)
      try {
        await supabaseAdmin
          .from('payment_transactions')
          .insert({
            student_id: student.id,
            amount: pricePaid,
            lesson_credits: packageSize,
            payment_method: paymentMethod,
            notes: notes || `${packageSize}-lesson package`
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
            <p className="current-credits">Current Credits: <strong>{creditsRemaining}</strong></p>
          </div>

          {/* Pricing Tier Display */}
          {pricingTier && (
            <div className="package-form-group">
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
          <div className="package-form-group">
            <label>Lesson Type</label>
            <div className="student-type-toggle">
              <button
                type="button"
                onClick={() => handleNumPeopleChange(1)}
                className={`toggle-btn ${numPeople === 1 ? 'active' : ''}`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => handleNumPeopleChange(2)}
                className={`toggle-btn ${numPeople === 2 ? 'active' : ''}`}
              >
                Semi-Private (2 people)
              </button>
            </div>
          </div>

          {/* Package Selection */}
          {loading ? (
            <div className="package-form-group">
              <p>Loading pricing...</p>
            </div>
          ) : packageOptions.length === 0 ? (
            <div className="package-form-group">
              <p style={{ color: '#999' }}>No packages available for this tier and lesson type.</p>
            </div>
          ) : (
            <div className="package-form-group">
              <label>Select Package</label>
              <div className="package-buttons">
                {packageOptions.map(pkg => (
                  <button
                    key={`${pkg.package_size}-${pkg.num_people}`}
                    type="button"
                    onClick={() => handlePackageChange(pkg.package_size)}
                    className={`package-option-btn ${packageSize === pkg.package_size ? 'selected' : ''}`}
                  >
                    <div className="package-lessons">{pkg.package_size} {pkg.package_size === 1 ? 'Lesson' : 'Lessons'}</div>
                    <div className="package-price">${pkg.price.toFixed(2)}</div>
                    <div className="package-per-lesson">${(pkg.price / pkg.package_size).toFixed(2)}/lesson</div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                Using {pricingTier?.display_name || 'standard'} pricing
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
              <span>Lesson Type:</span>
              <span>{numPeople === 1 ? 'Individual' : 'Semi-Private (2 people)'}</span>
            </div>
            {pricingTier && (
              <div className="summary-row">
                <span>Pricing Tier:</span>
                <span>{pricingTier.display_name}</span>
              </div>
            )}
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
