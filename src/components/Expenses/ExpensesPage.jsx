import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, Search, Edit2, Trash2, Download, Calendar, DollarSign, Tag } from 'lucide-react'
import './ExpensesPage.css'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'expense_date', direction: 'desc' })

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    notes: ''
  })

  const categories = [
    'Equipment',
    'Court Rental',
    'Marketing',
    'Travel',
    'Insurance',
    'Software/Subscriptions',
    'Certification/Training',
    'Supplies',
    'Taxes',
    'Other'
  ]

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({
            name: formData.name,
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            category: formData.category,
            notes: formData.notes
          })
          .eq('id', editingExpense.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert({
            name: formData.name,
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            category: formData.category,
            notes: formData.notes
          })

        if (error) throw error
      }

      setShowAddModal(false)
      setEditingExpense(null)
      resetForm()
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Error saving expense: ' + error.message)
    }
  }

  const handleDelete = async (expense) => {
    if (!confirm(`Delete expense "${expense.name}"?`)) return

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id)

      if (error) throw error
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Error deleting expense: ' + error.message)
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData({
      name: expense.name,
      amount: expense.amount,
      expense_date: expense.expense_date,
      category: expense.category || '',
      notes: expense.notes || ''
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      notes: ''
    })
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e => 
        e.name.toLowerCase().includes(term) ||
        (e.category && e.category.toLowerCase().includes(term)) ||
        (e.notes && e.notes.toLowerCase().includes(term))
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(e => e.category === categoryFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      result = result.filter(e => {
        const expenseDate = new Date(e.expense_date)
        switch (dateFilter) {
          case 'thisMonth':
            return expenseDate >= startOfMonth
          case 'thisYear':
            return expenseDate >= startOfYear
          case 'last30':
            return expenseDate >= last30Days
          case 'last90':
            return expenseDate >= last90Days
          default:
            return true
        }
      })
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal
      switch (sortConfig.key) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'amount':
          aVal = a.amount
          bVal = b.amount
          break
        case 'expense_date':
          aVal = a.expense_date
          bVal = b.expense_date
          break
        case 'category':
          aVal = (a.category || '').toLowerCase()
          bVal = (b.category || '').toLowerCase()
          break
        default:
          return 0
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [expenses, searchTerm, categoryFilter, dateFilter, sortConfig])

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
  const expensesByCategory = useMemo(() => {
    const byCategory = {}
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Uncategorized'
      byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0)
    })
    return Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  }, [filteredExpenses])

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Name', 'Amount', 'Date', 'Category', 'Notes']
    const rows = filteredExpenses.map(e => [
      e.name,
      e.amount,
      e.expense_date,
      e.category || '',
      e.notes || ''
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="sort-indicator">⇅</span>
    return <span className="sort-indicator active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
  }

  if (loading) {
    return (
      <div className="expenses-page">
        <div className="loading-state">Loading expenses...</div>
      </div>
    )
  }

  return (
    <div className="expenses-page">
      <div className="expenses-header">
        <h1>💸 Expenses</h1>
        <button className="btn btn-primary add-expense-btn" onClick={() => {
          resetForm()
          setEditingExpense(null)
          setShowAddModal(true)
        }}>
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="expenses-stats">
        <div className="expense-stat-card total">
          <DollarSign size={24} />
          <div>
            <div className="stat-label">Total Expenses</div>
            <div className="stat-value">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="expense-stat-card count">
          <Tag size={24} />
          <div>
            <div className="stat-label">Expense Count</div>
            <div className="stat-value">{filteredExpenses.length}</div>
          </div>
        </div>
        {expensesByCategory.slice(0, 2).map(([category, amount]) => (
          <div key={category} className="expense-stat-card category">
            <div>
              <div className="stat-label">{category}</div>
              <div className="stat-value">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="expenses-filters">
        <div className="search-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="input"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          className="input"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="thisMonth">This Month</option>
          <option value="thisYear">This Year</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
        </select>
        <button className="btn btn-outline" onClick={exportCSV}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="empty-state">
          <p>No expenses found.</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add Your First Expense
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="expenses-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  Name <SortIndicator columnKey="name" />
                </th>
                <th onClick={() => handleSort('amount')} className="sortable">
                  Amount <SortIndicator columnKey="amount" />
                </th>
                <th onClick={() => handleSort('expense_date')} className="sortable">
                  Date <SortIndicator columnKey="expense_date" />
                </th>
                <th onClick={() => handleSort('category')} className="sortable">
                  Category <SortIndicator columnKey="category" />
                </th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense.id}>
                  <td className="expense-name">{expense.name}</td>
                  <td className="expense-amount">${parseFloat(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>
                    {expense.category && (
                      <span className="category-badge">{expense.category}</span>
                    )}
                  </td>
                  <td className="expense-notes">{expense.notes || '-'}</td>
                  <td className="expense-actions">
                    <button className="btn-icon" onClick={() => handleEdit(expense)} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon delete" onClick={() => handleDelete(expense)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Breakdown */}
      {expensesByCategory.length > 0 && (
        <div className="category-breakdown">
          <h2>Expenses by Category</h2>
          <div className="category-list">
            {expensesByCategory.map(([category, amount]) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <div className="category-bar-container">
                  <div 
                    className="category-bar" 
                    style={{ width: `${(amount / totalExpenses) * 100}%` }}
                  />
                </div>
                <span className="category-amount">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="category-percent">{((amount / totalExpenses) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Ball hopper, Court reservation"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="input"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

