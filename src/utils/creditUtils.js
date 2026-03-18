/**
 * Centralized lesson credit utilities.
 * Source of truth: student_packages (lessons_remaining, lessons_used).
 * students.lesson_credits is a cache that must be synced through these helpers.
 */

/**
 * Sync students.lesson_credits to match the active package's lessons_remaining.
 * Exported for use when package data is edited manually.
 * @param {string} studentId
 * @param {object} supabaseClient
 * @param {number} [overrideValue] - If provided, write this value instead of reading from package
 */
export async function syncLessonCreditsCache(studentId, supabaseClient, overrideValue) {
  let creditsToWrite = overrideValue
  if (creditsToWrite === undefined) {
    const { data: pkg } = await supabaseClient
      .from('student_packages')
      .select('lessons_remaining, lessons_purchased, lessons_used')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .maybeSingle()
    creditsToWrite = pkg != null && Number.isFinite(pkg.lessons_remaining)
      ? Math.max(0, pkg.lessons_remaining)
      : pkg
        ? Math.max(0, (Number(pkg.lessons_purchased) || 0) - (Number(pkg.lessons_used) || 0))
        : 0
  }
  await supabaseClient
    .from('students')
    .update({ lesson_credits: Math.max(0, creditsToWrite) })
    .eq('id', studentId)
}

/**
 * Deduct 1 lesson credit when a lesson is completed.
 * Updates active package (lessons_used, lessons_remaining, is_active), inserts lesson_transaction,
 * then syncs students.lesson_credits. If no active package, decrements students.lesson_credits directly.
 * @param {string} studentId
 * @param {object} supabaseClient
 * @param {{ lessonId?: string, lessonDate?: string }} [opts]
 */
export async function deductLessonCredit(studentId, supabaseClient, opts = {}) {
  const lessonDate = opts.lessonDate
    ? new Date(opts.lessonDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const { data: activePkg } = await supabaseClient
    .from('student_packages')
    .select('id, lessons_remaining, lessons_used, lessons_purchased')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .order('purchased_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (activePkg) {
    const newLessonsUsed = (activePkg.lessons_used || 0) + 1
    const newLessonsRemaining = Math.max(0, (activePkg.lessons_remaining ?? activePkg.lessons_purchased - activePkg.lessons_used) - 1)
    const isNowComplete = newLessonsRemaining <= 0

    await supabaseClient
      .from('student_packages')
      .update({
        lessons_used: newLessonsUsed,
        is_active: !isNowComplete,
        updated_at: new Date().toISOString()
      })
      .eq('id', activePkg.id)

    // Deduplicate: check if lesson_transaction already exists (by lesson_id or date+student)
    let shouldInsertTx = true
    if (opts.lessonId) {
      const { data: existingByLesson } = await supabaseClient
        .from('lesson_transactions')
        .select('id')
        .eq('lesson_id', opts.lessonId)
        .maybeSingle()
      shouldInsertTx = !existingByLesson
    }
    if (shouldInsertTx) {
      const { data: existingByDate } = await supabaseClient
        .from('lesson_transactions')
        .select('id')
        .eq('student_id', studentId)
        .eq('transaction_date', lessonDate)
        .eq('transaction_type', 'lesson_taken')
        .maybeSingle()
      shouldInsertTx = !existingByDate
    }
    if (shouldInsertTx) {
      const txRow = {
        student_id: studentId,
        package_id: activePkg.id,
        credits_used: 1,
        transaction_type: 'lesson_taken',
        transaction_date: lessonDate,
        ...(opts.lessonId && { lesson_id: opts.lessonId })
      }
      await supabaseClient.from('lesson_transactions').insert(txRow)
    }

    await syncLessonCreditsCache(studentId, supabaseClient)
  } else {
    // No active package: decrement students.lesson_credits directly
    const { data: student } = await supabaseClient
      .from('students')
      .select('lesson_credits')
      .eq('id', studentId)
      .single()
    const current = student?.lesson_credits ?? 0
    const newCredits = Math.max(0, current - 1)
    await supabaseClient
      .from('students')
      .update({ lesson_credits: newCredits })
      .eq('id', studentId)
    // Still record transaction for tracking (without package_id)
    const { data: existingByDate } = await supabaseClient
      .from('lesson_transactions')
      .select('id')
      .eq('student_id', studentId)
      .eq('transaction_date', lessonDate)
      .eq('transaction_type', 'lesson_taken')
      .maybeSingle()
    if (!existingByDate) {
      await supabaseClient.from('lesson_transactions').insert({
        student_id: studentId,
        credits_used: 1,
        transaction_type: 'lesson_taken',
        transaction_date: lessonDate,
        ...(opts.lessonId && { lesson_id: opts.lessonId })
      })
    }
  }
}

/**
 * Add a bonus credit (e.g. referral reward).
 * If active package exists: increments lessons_purchased and lessons_remaining.
 * Always increments students.lesson_credits and total_lessons_purchased.
 * @param {string} studentId
 * @param {object} supabaseClient
 * @param {string} [notes]
 */
export async function addBonusCredit(studentId, supabaseClient, notes = '') {
  const { data: activePkg } = await supabaseClient
    .from('student_packages')
    .select('id, lessons_purchased, lessons_remaining')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .order('purchased_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activePkg) {
    const newLessonsPurchased = (activePkg.lessons_purchased || 0) + 1
    await supabaseClient
      .from('student_packages')
      .update({
        lessons_purchased: newLessonsPurchased,
        updated_at: new Date().toISOString()
      })
      .eq('id', activePkg.id)
  }

  const { data: student } = await supabaseClient
    .from('students')
    .select('lesson_credits, total_lessons_purchased')
    .eq('id', studentId)
    .single()
  const newCredits = (student?.lesson_credits ?? 0) + 1
  const newTotalPurchased = (student?.total_lessons_purchased ?? 0) + 1
  await supabaseClient
    .from('students')
    .update({
      lesson_credits: newCredits,
      total_lessons_purchased: newTotalPurchased
    })
    .eq('id', studentId)
}

/**
 * Set lesson credits (coach manual override).
 * Applies delta to active package if exists, then updates students.lesson_credits.
 * @param {string} studentId
 * @param {number} newCredits
 * @param {object} supabaseClient
 */
export async function setLessonCredits(studentId, newCredits, supabaseClient) {
  const safeNew = Math.max(0, parseInt(newCredits, 10) || 0)

  const { data: student } = await supabaseClient
    .from('students')
    .select('lesson_credits')
    .eq('id', studentId)
    .single()
  const current = student?.lesson_credits ?? 0
  const delta = safeNew - current

  const { data: activePkg } = await supabaseClient
    .from('student_packages')
    .select('id, lessons_remaining, lessons_purchased, lessons_used')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .order('purchased_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (activePkg && delta !== 0) {
    const curPurchased = activePkg.lessons_purchased || 0
    const curUsed = activePkg.lessons_used || 0
    let newPurchased = curPurchased
    let newUsed = curUsed
    if (delta > 0) {
      newPurchased = curPurchased + delta
    } else {
      newUsed = Math.min(curPurchased, curUsed + Math.abs(delta))
    }
    await supabaseClient
      .from('student_packages')
      .update({
        lessons_purchased: newPurchased,
        lessons_used: newUsed,
        is_active: newPurchased - newUsed > 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', activePkg.id)
  }

  await syncLessonCreditsCache(studentId, supabaseClient, safeNew)
}
