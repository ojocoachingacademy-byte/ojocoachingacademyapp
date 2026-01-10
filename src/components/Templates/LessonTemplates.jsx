import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './LessonTemplates.css'

// Default templates if database is empty
const DEFAULT_TEMPLATES = [
  {
    id: 'default-1',
    template_name: 'Beginner Forehand',
    template_category: 'Groundstrokes',
    lesson_plan_content: `WARM UP (5 min)
- Light jogging and dynamic stretching
- Mini tennis from service line

TECHNIQUE FOCUS: FOREHAND (20 min)
- Ready position and grip check (Eastern forehand)
- Unit turn and racket preparation
- Contact point in front of body
- Follow through over shoulder
- Shadow swings without ball
- Drop and hit (self-feed)

DRILL WORK (20 min)
- Coach feeds to forehand side
- Cross-court forehand rally practice
- Progressive difficulty: slow → medium pace

SITUATIONAL PLAY (10 min)
- Rally maintaining forehand side
- Point play starting with forehand

COOL DOWN (5 min)
- Light stretching
- Key takeaways discussion
- Homework: Shadow swings in front of mirror`
  },
  {
    id: 'default-2',
    template_name: 'Beginner Backhand',
    template_category: 'Groundstrokes',
    lesson_plan_content: `WARM UP (5 min)
- Dynamic stretching
- Mini tennis (forehand only to warm up)

TECHNIQUE FOCUS: TWO-HANDED BACKHAND (20 min)
- Grip position (Continental + Eastern)
- Shoulder turn and unit turn
- Low to high swing path
- Contact point and balance
- Non-dominant hand drives the shot
- Shadow swings and slow motion practice

DRILL WORK (20 min)
- Toss and hit self-feeds
- Coach feeds to backhand side
- Cross-court backhand rally
- Down-the-line backhand introduction

SITUATIONAL PLAY (10 min)
- Rally keeping ball on backhand side
- Point play emphasizing backhand

COOL DOWN (5 min)
- Stretching
- Review key checkpoints
- Practice assignment for the week`
  },
  {
    id: 'default-3',
    template_name: 'Serve Development',
    template_category: 'Serve',
    lesson_plan_content: `WARM UP (5 min)
- Shoulder and arm circles
- Shadow serve motion
- Light ball tosses

TECHNIQUE FOCUS: SERVE (25 min)
- Continental grip check
- Ball toss consistency (12 o'clock position)
- Trophy position
- Pronation and snap
- Follow through into court
- Service motion breakdown:
  1. Start position
  2. Toss and backswing
  3. Trophy position pause
  4. Racket drop and acceleration
  5. Contact and follow through

PROGRESSIVE PRACTICE (20 min)
- Serve from service line
- Move back to 3/4 court
- Full court serving
- Target practice (deuce/ad)

GAME APPLICATION (5 min)
- Serve and play points
- First serve percentage tracking

COOL DOWN (5 min)
- Shoulder stretches
- Key points review
- Daily serve practice recommendation`
  },
  {
    id: 'default-4',
    template_name: 'Net Game & Volleys',
    template_category: 'Net Play',
    lesson_plan_content: `WARM UP (5 min)
- Light rally from baseline
- Move to service line volleys

TECHNIQUE FOCUS: VOLLEYS (20 min)
- Continental grip for both sides
- Split step and ready position
- Punch don't swing
- Step and catch motion
- Forehand volley technique
- Backhand volley technique
- High volleys vs low volleys

DRILL WORK (20 min)
- Coach feeds alternating volleys
- Two-ball drill (FH then BH)
- Approach shot → volley → overhead sequence
- Volley-to-volley rally

SITUATIONAL PLAY (10 min)
- Approach and finish at net
- Serve and volley patterns
- Doubles positioning at net

COOL DOWN (5 min)
- Stretching
- Movement patterns review
- Net game homework`
  },
  {
    id: 'default-5',
    template_name: 'Match Play Strategy',
    template_category: 'Strategy',
    lesson_plan_content: `WARM UP (5 min)
- Full court rally
- All strokes warm-up

TACTICAL FOCUS (15 min)
- Shot selection discussion
- When to go cross-court vs down-the-line
- Building points patiently
- Recognizing attack opportunities
- Recovery positioning

PATTERN DRILLS (20 min)
- Cross-court rally → short ball → attack
- Serve + forehand inside-out
- Deep ball → approach → volley
- Defense to offense transition

POINT PLAY WITH THEMES (15 min)
- Play points: must hit 3 shots before attacking
- Play points: serve and approach
- Play points: first to net wins

MATCH SIMULATION (5 min)
- Tie-break practice
- Pressure point scenarios

DEBRIEF (5 min)
- What worked well
- Areas to focus on
- Match play mental notes`
  },
  {
    id: 'default-6',
    template_name: 'Footwork & Movement',
    template_category: 'Fitness',
    lesson_plan_content: `WARM UP (10 min)
- Dynamic stretching
- Ladder drills
- Side shuffles and crossover steps

FOOTWORK FUNDAMENTALS (15 min)
- Split step timing
- First step explosion
- Recovery steps
- Open vs closed stance
- Adjustment steps for contact

MOVEMENT PATTERNS (15 min)
- Baseline side-to-side movement
- Up and back transitions
- Diagonal movements
- Figure 8 patterns

LIVE BALL FOOTWORK (15 min)
- Coach feeds while emphasizing footwork
- Ball machine with movement focus
- Rally with deliberate positioning

AGILITY GAMES (5 min)
- Reaction ball catches
- Quick direction changes
- Competition-style sprints

COOL DOWN (5 min)
- Static stretching
- Foam rolling if available
- Footwork homework drills`
  }
]

export default function LessonTemplates({ onSelectTemplate, onClose }) {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_templates')
        .select('*')
        .order('template_category', { ascending: true })

      if (error) {
        console.log('Using default templates (table may not exist yet)')
        setTemplates(DEFAULT_TEMPLATES)
      } else {
        // If no templates in DB, use defaults
        setTemplates(data && data.length > 0 ? data : DEFAULT_TEMPLATES)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setTemplates(DEFAULT_TEMPLATES)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
  }

  const handleApplyTemplate = () => {
    if (selectedTemplate && onSelectTemplate) {
      onSelectTemplate(selectedTemplate.lesson_plan_content)
      onClose()
    }
  }

  // Get unique categories
  const categories = ['All', ...new Set(templates.map(t => t.template_category))]
  
  // Filter templates by category
  const filteredTemplates = activeCategory === 'All' 
    ? templates 
    : templates.filter(t => t.template_category === activeCategory)

  if (loading) {
    return (
      <div className="templates-container">
        <div className="loading">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="templates-container">
      <div className="templates-header">
        <h2>📋 Choose a Lesson Template</h2>
        <button onClick={onClose} className="btn-close">×</button>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category}
            className={`category-btn ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="templates-content">
        {!selectedTemplate ? (
          <div className="templates-list">
            {filteredTemplates.map(template => (
              <div 
                key={template.id}
                className="template-card"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="template-category-badge">{template.template_category}</div>
                <h3>{template.template_name}</h3>
                <p className="template-preview-text">
                  {template.lesson_plan_content.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="template-preview">
            <div className="preview-header">
              <button onClick={() => setSelectedTemplate(null)} className="btn-back">
                ← Back to Templates
              </button>
              <span className="preview-category">{selectedTemplate.template_category}</span>
            </div>
            <h3>{selectedTemplate.template_name}</h3>
            <div className="template-content">
              <pre>{selectedTemplate.lesson_plan_content}</pre>
            </div>
            <div className="template-actions">
              <button onClick={handleApplyTemplate} className="btn-primary">
                ✓ Use This Template
              </button>
              <button onClick={() => setSelectedTemplate(null)} className="btn-outline">
                Choose Different
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


