-- Additional RLS Policy for Hitting Partners Directory
-- This allows authenticated users to read all active hitting partners for the directory

-- Allow authenticated users to read all active hitting partners (for directory)
CREATE POLICY "Authenticated users can read active hitting partners"
ON hitting_partners
FOR SELECT
TO authenticated
USING (is_active = true);

-- Note: This policy works alongside the existing "Users can read their own hitting partner record" policy
-- Users can read their own record regardless of is_active status, and can read all active records for the directory

