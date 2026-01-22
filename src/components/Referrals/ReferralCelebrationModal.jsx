import { useState } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import '../shared/Modal.css'

export default function ReferralCelebrationModal({ 
  referrerName, 
  referredName, 
  referrerId,
  onClose 
}) {
  const [addingCredit, setAddingCredit] = useState(false)
  const [creditAdded, setCreditAdded] = useState(false)

  const handleAddCredit = async () => {
    setAddingCredit(true)
    try {
      // Get current credits
      const { data: student, error: fetchError } = await supabaseAdmin
        .from('students')
        .select('lesson_credits')
        .eq('id', referrerId)
        .single()

      if (fetchError) throw fetchError

      const currentCredits = student.lesson_credits || 0

      // Add 1 credit
      const { error: updateError } = await supabaseAdmin
        .from('students')
        .update({ lesson_credits: currentCredits + 1 })
        .eq('id', referrerId)

      if (updateError) throw updateError

      setCreditAdded(true)
    } catch (error) {
      console.error('Error adding referral credit:', error)
      alert('Error adding credit: ' + error.message)
    } finally {
      setAddingCredit(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '500px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #4B2C6C 0%, #6A4C8C 100%)',
          color: 'white',
          padding: '40px'
        }}
      >
        {/* Celebration Animation */}
        <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'bounce 1s ease infinite' }}>
          🎉
        </div>
        
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        <h2 style={{ 
          fontSize: '32px', 
          marginBottom: '16px',
          color: 'white',
          fontWeight: '700'
        }}>
          Congratulations!
        </h2>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{ 
            fontSize: '18px', 
            marginBottom: '12px',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: '#F4C430' }}>{referrerName}</strong> referred
          </p>
          <p style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#F4C430',
            marginBottom: '12px'
          }}>
            {referredName}
          </p>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            They've earned a free lesson! 🎾
          </p>
        </div>

        {!creditAdded ? (
          <button
            className="btn btn-primary"
            onClick={handleAddCredit}
            disabled={addingCredit}
            style={{
              backgroundColor: '#F4C430',
              color: '#4B2C6C',
              border: 'none',
              fontSize: '18px',
              padding: '16px 32px',
              fontWeight: '700',
              width: '100%',
              marginBottom: '16px',
              cursor: addingCredit ? 'wait' : 'pointer',
              opacity: addingCredit ? 0.7 : 1
            }}
          >
            {addingCredit ? '⏳ Adding Credit...' : '💰 Add Free Lesson Credit'}
          </button>
        ) : (
          <div style={{
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '2px solid #4CAF50'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <p style={{ fontSize: '16px', fontWeight: '600' }}>
              Credit Added Successfully!
            </p>
          </div>
        )}

        <button
          className="btn btn-outline"
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: '2px solid white',
            color: 'white',
            fontSize: '16px',
            padding: '12px 24px',
            width: '100%'
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
