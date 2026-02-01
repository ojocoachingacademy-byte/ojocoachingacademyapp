export const MILESTONES = [
  { number: 1, name: "First Contact", description: "Hit 3 forehands over the net in a row", category: "Day 1 Beginner" },
  { number: 2, name: "Both Wings", description: "Hit 3 backhands over the net in a row", category: "Day 1 Beginner" },
  { number: 3, name: "Rally Baby", description: "Rally 5 balls back and forth with coach", category: "Day 1 Beginner" },
  { number: 4, name: "Service Box", description: "Get a serve into the service box", category: "Day 1 Beginner" },
  { number: 5, name: "Volley Touch", description: "Hit 5 forehand volleys in a row at net", category: "Day 1 Beginner" },
  { number: 6, name: "Ten Streak", description: "Hit 10 forehands in a row over the net", category: "Early Beginner" },
  { number: 7, name: "Backhand Builder", description: "Hit 10 backhands in a row over the net", category: "Early Beginner" },
  { number: 8, name: "First Rally", description: "Rally 15 balls baseline to baseline", category: "Early Beginner" },
  { number: 9, name: "Service Progress", description: "Get 3 out of 10 serves in", category: "Early Beginner" },
  { number: 10, name: "Cross Court", description: "Hit 10 cross-court forehands in a row", category: "Early Beginner" },
  { number: 11, name: "Rally Champion", description: "Rally 25 balls without an error", category: "Solid Beginner" },
  { number: 12, name: "Backhand Control", description: "Hit 10 cross-court backhands in a row", category: "Solid Beginner" },
  { number: 13, name: "Service Consistency", description: "Get 6 out of 10 serves in", category: "Solid Beginner" },
  { number: 14, name: "Down the Line", description: "Hit 5 down-the-line forehands in a row", category: "Solid Beginner" },
  { number: 15, name: "Volley Victory", description: "Hit 5 backhand volleys in a row at the net", category: "Solid Beginner" },
  { number: 16, name: "The Thirty", description: "Rally 30 balls without an error", category: "Advanced Beginner" },
  { number: 17, name: "Serve Zones", description: "Hit right and left side of service box on both sides (4 serves in a row)", category: "Advanced Beginner" },
  { number: 18, name: "Approach Shot", description: "Hit approach and finish point at net 3 times", category: "Advanced Beginner" },
  { number: 19, name: "Consistent Server", description: "Hold a service game in practice (4 points)", category: "Advanced Beginner" },
  { number: 20, name: "Game Winner", description: "Win a practice game to 4 points", category: "Advanced Beginner" },
  { number: 21, name: "The Fifty", description: "Rally 50 balls without an error", category: "Early Intermediate" },
  { number: 22, name: "Serve Pressure", description: "Get 10 serves in a row into the box", category: "Early Intermediate" },
  { number: 23, name: "Return Winner", description: "Win 3 points off return of serve in practice game", category: "Early Intermediate" },
  { number: 24, name: "Break Point", description: "Break serve in a practice game", category: "Early Intermediate" },
  { number: 25, name: "Set Player", description: "Complete a full practice set (win or lose)", category: "Early Intermediate" },
  { number: 26, name: "Love Hold", description: "Hold serve without losing a point (4-0 game)", category: "Match Ready" },
  { number: 27, name: "The Comeback", description: "Win a game after being down 0-40", category: "Match Ready" },
  { number: 28, name: "Set Winner", description: "Win a practice set 6-4 or better", category: "Match Ready" },
  { number: 29, name: "Match Player", description: "Win a full practice match (2 sets)", category: "Competitive" },
  { number: 30, name: "The Ace", description: "Hit an ace in a real match situation", category: "Competitive" },
]

export const GOAL_OPTIONS = [
  { value: 'start_hobby', label: 'Start a new hobby that gets me outside and exercising', targetMilestone: 15 },
  { value: 'rally_with_friend', label: 'Be able to rally with my partner/friend and actually know what I\'m doing', targetMilestone: 15 },
  { value: 'build_confidence', label: 'Build my confidence to play again after a long break', targetMilestone: 15 },
  { value: 'join_doubles', label: 'Join a weekly doubles group', targetMilestone: 20 },
  { value: 'usta_league', label: 'Play in a USTA league or tournament', targetMilestone: 28 },
]

export const SUNDAY_VISION_OPTIONS = [
  "I'm playing doubles at the park with three friends",
  "I'm booking court time with my friend/partner/family twice a week",
  "I'm hitting with the intermediate group without feeling like I don't belong",
  "I am playing in a league or tournament match",
]

export const SKILL_AREAS = [
  { key: 'forehand', name: 'Forehand', question: 'Can I hit it where I want consistently?' },
  { key: 'backhand', name: 'Backhand', question: 'Is it a weapon or a weakness?' },
  { key: 'serve', name: 'Serve', question: 'Can I start the point with confidence?' },
  { key: 'net', name: 'Net Game', question: 'Am I comfortable at the net?' },
  { key: 'movement', name: 'Movement', question: 'Can I get to balls and stay balanced?' },
]

export const ADVANCED_MILESTONES = [
  // Consistency & Control (1-5)
  { number: 1, name: "Depth Master", description: "Hit 15 groundstrokes in a row landing beyond service line", category: "Consistency & Control" },
  { number: 2, name: "Serve Zones", description: "Place 8/10 serves in specific corners", category: "Consistency & Control" },
  { number: 3, name: "Volley Reflex", description: "React to 10 quick volleys at net without errors", category: "Consistency & Control" },
  { number: 4, name: "Return Positioning", description: "Return 8/10 serves landing in the deep third of the court", category: "Consistency & Control" },
  { number: 5, name: "Rally Endurance", description: "Rally 75 balls without an unforced error", category: "Consistency & Control" },
  
  // Match Play Fundamentals (6-10)
  { number: 6, name: "Service Hold", description: "Hold serve 4 games in a row in practice match", category: "Match Play Fundamentals" },
  { number: 7, name: "Break Through", description: "Break serve 3 times in one practice set", category: "Match Play Fundamentals" },
  { number: 8, name: "Dominant Win", description: "Win a practice set 6-2 or better", category: "Match Play Fundamentals" },
  { number: 9, name: "Three-Setter", description: "Complete a full best-of-3 match", category: "Match Play Fundamentals" },
  { number: 10, name: "The Comeback", description: "Win a set after losing the first set", category: "Match Play Fundamentals" },
  
  // Advanced Technique (11-15)
  { number: 11, name: "Topspin Rally", description: "Rally 20 balls cross-court with ball landing in back half of court", category: "Advanced Technique" },
  { number: 12, name: "Slice Mastery", description: "Execute 4 different slices: defensive, approach, drop, short angle (forehand and backhand)", category: "Advanced Technique" },
  { number: 13, name: "Kick Serve", description: "Hit 6/10 kick serves with good bounce", category: "Advanced Technique" },
  { number: 14, name: "Drop Shot", description: "Win 3 points with drop shots in practice match", category: "Advanced Technique" },
  { number: 15, name: "Overhead Dominance", description: "Win 5 points in a row finishing with overheads", category: "Advanced Technique" },
  
  // Tactical Development (16-20)
  { number: 16, name: "Pattern Player", description: "Execute a 3-shot pattern 5 times successfully", category: "Tactical Development" },
  { number: 17, name: "Weakness Hunter", description: "Identify and exploit opponent's weakness for a game", category: "Tactical Development" },
  { number: 18, name: "Surface Adapt", description: "Play on a different surface and win", category: "Tactical Development" },
  { number: 19, name: "Doubles Dynamics", description: "Win a doubles match with strong net positioning", category: "Tactical Development" },
  { number: 20, name: "Tournament Entry", description: "Win your first local tournament match", category: "Tactical Development" },
  
  // Competitive Play (21-25)
  { number: 21, name: "Tournament Run", description: "Win 3 rounds at a tournament", category: "Competitive Play" },
  { number: 22, name: "Tournament Winner", description: "Win a local tournament (any level)", category: "Competitive Play" },
  { number: 23, name: "Level Up", description: "Beat a 4.0 rated player in match play", category: "Competitive Play" },
  { number: 24, name: "Season Player", description: "Play 8 USTA matches in a year", category: "Competitive Play" },
  { number: 25, name: "Mental Game", description: "Win a match after being match point down", category: "Competitive Play" },
  
  // Advanced Competition (26-30)
  { number: 26, name: "League Champion", description: "Win your USTA league season", category: "Advanced Competition" },
  { number: 27, name: "Tournament Finals", description: "Reach finals of a sanctioned tournament", category: "Advanced Competition" },
  { number: 28, name: "Elite Victory", description: "Beat a 4.5 or 5.0 rated player", category: "Advanced Competition" },
  { number: 29, name: "Tournament Circuit", description: "Play 5+ sanctioned tournaments in a year", category: "Advanced Competition" },
  { number: 30, name: "Rating Bump", description: "Your rating gets bumped up a level", category: "Advanced Competition" },
]

export function getMilestonesByLevel(playerLevel) {
  return playerLevel === 'advanced' ? ADVANCED_MILESTONES : MILESTONES
}

