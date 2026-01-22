-- Add recurring expense fields to expenses table
-- This allows expenses to be marked as recurring with a frequency

ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT CHECK (recurrence_frequency IN ('weekly', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurrence_start_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS parent_expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS next_recurrence_date DATE;

-- Index for faster queries on recurring expenses
CREATE INDEX IF NOT EXISTS idx_expenses_is_recurring ON expenses(is_recurring);
CREATE INDEX IF NOT EXISTS idx_expenses_next_recurrence_date ON expenses(next_recurrence_date);
CREATE INDEX IF NOT EXISTS idx_expenses_parent_expense_id ON expenses(parent_expense_id);

-- Comment on columns
COMMENT ON COLUMN expenses.is_recurring IS 'Whether this expense is recurring';
COMMENT ON COLUMN expenses.recurrence_frequency IS 'Frequency of recurrence: weekly, monthly, or yearly';
COMMENT ON COLUMN expenses.recurrence_start_date IS 'Date when the recurring expense started';
COMMENT ON COLUMN expenses.recurrence_end_date IS 'Optional end date for recurring expense (NULL = no end date)';
COMMENT ON COLUMN expenses.parent_expense_id IS 'Reference to the original expense if this is a generated recurrence';
COMMENT ON COLUMN expenses.next_recurrence_date IS 'Next date when this expense should recur (for parent expenses)';
