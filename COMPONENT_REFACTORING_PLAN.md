# Component Refactoring Plan

## Large Components That Need Refactoring

### 1. StudentDetailPage.jsx (2337 lines)
**Current Issues:**
- Too large to maintain effectively
- Hard to test individual features
- Multiple responsibilities mixed together

**Recommended Breakdown:**
- `StudentDetailHeader.jsx` - Header with back button, student name, status
- `StudentOverviewTab.jsx` - Overview tab content
- `StudentLessonsTab.jsx` - Lessons list and management
- `StudentFinancialTab.jsx` - Financial data and editing
- `StudentDevelopmentTab.jsx` - Development plan display/editing
- `StudentPracticePlansTab.jsx` - Practice plans management
- `StudentProfileEditor.jsx` - Profile editing modal/form
- `StudentActionsBar.jsx` - Action buttons (message, book lesson, etc.)
- `StudentStatsCard.jsx` - Statistics display
- `StudentFocusAreasSection.jsx` - Areas to focus on management

**Benefits:**
- Easier to test individual features
- Better code organization
- Improved performance (code splitting)
- Easier for multiple developers to work on

### 2. StudentDashboard.jsx (1398 lines)
**Current Issues:**
- Multiple tabs and features in one file
- Complex state management
- Hard to navigate

**Recommended Breakdown:**
- `StudentDashboardLayout.jsx` - Main layout wrapper
- `StudentDashboardHeader.jsx` - Header with tabs
- `StudentDashboardContent.jsx` - Content area router
- `LearningsModal.jsx` - Submit learnings modal (already partially separated)
- `DevelopmentPlanSection.jsx` - Development plan display/editing
- `PracticePlanSection.jsx` - Practice plan display
- `UpcomingLessonsSection.jsx` - Upcoming lessons list
- `PastLessonsSection.jsx` - Past lessons list
- `ReferralSection.jsx` - Referral tracking

**Benefits:**
- Clearer separation of concerns
- Better maintainability
- Easier to add new features
- Improved code reusability

## Refactoring Strategy

### Phase 1: Extract Modals and Forms
- Extract all modal components
- Extract form components
- These are already somewhat isolated

### Phase 2: Extract Tab Components
- Move each tab to its own file
- Keep shared state in parent
- Use context for deeply nested state

### Phase 3: Extract Feature Sections
- Break down large tabs into smaller sections
- Create reusable card components
- Extract business logic to hooks

### Phase 4: Optimize and Test
- Add unit tests for extracted components
- Optimize re-renders
- Add code splitting

## Priority Order

1. **StudentDetailPage.jsx** - Highest priority (2337 lines)
2. **StudentDashboard.jsx** - High priority (1398 lines)
3. Other components over 500 lines

## Estimated Effort

- **StudentDetailPage**: 2-3 days
- **StudentDashboard**: 1-2 days
- **Testing**: 1 day
- **Total**: ~1 week

## Notes

- Keep existing functionality intact during refactoring
- Test thoroughly after each extraction
- Use feature flags if needed for gradual rollout
- Document component APIs as you extract them
