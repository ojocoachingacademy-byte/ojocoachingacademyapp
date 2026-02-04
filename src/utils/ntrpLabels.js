/**
 * Shared NTRP level options and labels for dropdowns and display.
 * Used in: Signup, StudentSettings, ProfileTab, StudentDetailPage, AddStudentModal, StudentsPage.
 */

export const NTRP_OPTIONS = [
  { value: '1.0', label: '1.0 - Beginner' },
  { value: '1.5', label: '1.5 - Limited Experience' },
  { value: '2.0', label: '2.0 - Can Play Sets' },
  { value: '2.5', label: '2.5 - Could Play on a League Team' },
  { value: '3.0', label: '3.0 - Could Play a Tournament' },
  { value: '3.5', label: '3.5 - Experienced Player' },
  { value: '4.0', label: '4.0 - Equivalent to Junior College Level' },
  { value: '4.5', label: '4.5 - Equivalent to D3 Level' },
  { value: '5.0', label: '5.0 - Equivalent D2-D1 Level' },
  { value: '5.5+', label: '5.5+ - D1+' }
]

const LABEL_BY_VALUE = Object.fromEntries(
  NTRP_OPTIONS.map(opt => [opt.value, opt.label])
)
// Legacy values: show as 5.5+ - D1+
LABEL_BY_VALUE['5.0+'] = '5.5+ - D1+'
LABEL_BY_VALUE['5.5'] = '5.5+ - D1+'
LABEL_BY_VALUE['6.0+'] = '5.5+ - D1+'

/**
 * Get display label for an NTRP value (e.g. "3.0" -> "3.0 - Could Play a Tournament").
 * Falls back to "N/A" or raw value if unknown.
 */
export function getNtrpLabel(value) {
  if (value == null || value === '') return 'N/A'
  const normalized = String(value).trim()
  return LABEL_BY_VALUE[normalized] ?? `NTRP ${normalized}`
}
