import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import './DropdownNav.css'

export default function DropdownNav({ label, icon: Icon, children }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="dropdown-nav" ref={dropdownRef}>
      <button
        className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon size={18} />}
        <span>{label}</span>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {children}
        </div>
      )}
    </div>
  )
}

