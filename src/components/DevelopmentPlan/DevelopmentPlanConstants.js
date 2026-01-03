// Mastering Fundamentals Skills Reference
export const MASTERING_FUNDAMENTALS_SKILLS = [
  {
    category: 'Groundstrokes',
    skills: [
      { name: 'Forehand', description: 'Forehand groundstroke technique and consistency' },
      { name: 'Backhand', description: 'Backhand groundstroke technique and consistency' }
    ]
  },
  {
    category: 'Volleys',
    skills: [
      { name: 'Forehand Volley', description: 'Forehand volley technique and placement' },
      { name: 'Backhand Volley', description: 'Backhand volley technique and placement' }
    ]
  },
  {
    category: 'Serve',
    skills: [
      { name: 'First Serve', description: 'First serve power, placement, and consistency' },
      { name: 'Second Serve', description: 'Second serve reliability and spin' }
    ]
  },
  {
    category: 'Return',
    skills: [
      { name: 'Return of Serve', description: 'Return of serve technique and placement' }
    ]
  },
  {
    category: 'Movement',
    skills: [
      { name: 'Footwork', description: 'Court movement, agility, and positioning' },
      { name: 'Court Positioning', description: 'Strategic court positioning and anticipation' }
    ]
  },
  {
    category: 'Mental & Strategy',
    skills: [
      { name: 'Mental Game', description: 'Focus, composure, and mental toughness' },
      { name: 'Match Strategy', description: 'Tactical awareness and game planning' }
    ]
  }
]

export const getAllSkills = () => {
  return MASTERING_FUNDAMENTALS_SKILLS.flatMap(category => 
    category.skills.map(skill => ({
      ...skill,
      category: category.category
    }))
  )
}

export const getSkillLevelColor = (level) => {
  if (level <= 2) return '#F44336' // Red
  if (level === 3) return '#FF9800' // Yellow/Orange
  return '#4CAF50' // Green
}

export const getSkillLevelLabel = (level) => {
  const labels = {
    1: 'Beginner',
    2: 'Developing',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Master'
  }
  return labels[level] || 'Unknown'
}



