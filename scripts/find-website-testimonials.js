/**
 * Script to help find testimonials in website repository
 * 
 * This script can be run in the website repository to extract
 * testimonial data from common locations.
 * 
 * Usage:
 * 1. Clone website repo locally
 * 2. Run: node scripts/find-website-testimonials.js
 * 3. It will search for testimonials and output JSON
 */

const fs = require('fs')
const path = require('path')

// Common file locations to check
const filesToCheck = [
  'index.html',
  'review.html',
  'testimonials.html',
  'script.js',
  'data/testimonials.json',
  'testimonials.json',
  'data.json'
]

// Search patterns
const patterns = {
  video: /<video[^>]*src=["']([^"']+)["'][^>]*>/gi,
  iframe: /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi,
  youtube: /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/gi,
  vimeo: /vimeo\.com\/(\d+)/gi,
  testimonialText: /testimonial|review|feedback/gi,
  name: /name["']?\s*[:=]\s*["']([^"']+)["']/gi
}

function findTestimonials(dir = '.') {
  console.log('🔍 Searching for testimonials...\n')
  
  const found = {
    videos: [],
    testimonials: [],
    files: []
  }

  // Check each file
  filesToCheck.forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.existsSync(filePath)) {
      console.log(`✅ Found: ${file}`)
      found.files.push(file)
      
      const content = fs.readFileSync(filePath, 'utf8')
      
      // Extract videos
      const videos = extractVideos(content, file)
      found.videos.push(...videos)
      
      // Extract testimonial data
      const testimonials = extractTestimonials(content, file)
      found.testimonials.push(...testimonials)
    }
  })

  // Search all HTML files
  const htmlFiles = findFiles(dir, /\.html$/i)
  htmlFiles.forEach(file => {
    if (!filesToCheck.includes(file)) {
      const content = fs.readFileSync(file, 'utf8')
      if (content.match(patterns.testimonialText)) {
        console.log(`📄 Possible testimonial page: ${file}`)
        found.files.push(file)
      }
    }
  })

  return found
}

function extractVideos(content, sourceFile) {
  const videos = []
  
  // Find video tags
  const videoMatches = [...content.matchAll(patterns.video)]
  videoMatches.forEach(match => {
    videos.push({
      type: 'video',
      url: match[1],
      source: sourceFile
    })
  })
  
  // Find iframes (YouTube, Vimeo, etc.)
  const iframeMatches = [...content.matchAll(patterns.iframe)]
  iframeMatches.forEach(match => {
    const url = match[1]
    if (url.includes('youtube') || url.includes('vimeo')) {
      videos.push({
        type: 'iframe',
        url: url,
        source: sourceFile
      })
    }
  })
  
  return videos
}

function extractTestimonials(content, sourceFile) {
  const testimonials = []
  
  // Try to find JSON data
  const jsonMatches = content.match(/\[[\s\S]*?\{[\s\S]*?testimonial[\s\S]*?\}[\s\S]*?\]/gi)
  if (jsonMatches) {
    jsonMatches.forEach(match => {
      try {
        const data = JSON.parse(match)
        if (Array.isArray(data)) {
          testimonials.push(...data.map(t => ({ ...t, source: sourceFile })))
        }
      } catch (e) {
        // Not valid JSON, skip
      }
    })
  }
  
  // Try to find JavaScript array
  const jsArrayMatch = content.match(/(?:const|let|var)\s+testimonials\s*=\s*(\[[\s\S]*?\])/i)
  if (jsArrayMatch) {
    try {
      const data = eval(jsArrayMatch[1])
      if (Array.isArray(data)) {
        testimonials.push(...data.map(t => ({ ...t, source: sourceFile })))
      }
    } catch (e) {
      // Not valid, skip
    }
  }
  
  return testimonials
}

function findFiles(dir, pattern) {
  const files = []
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    
    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath)
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath)
      }
    })
  }
  
  walk(dir)
  return files
}

// Main execution
if (require.main === module) {
  const websiteDir = process.argv[2] || '.'
  const results = findTestimonials(websiteDir)
  
  console.log('\n📊 Results:\n')
  console.log('Videos found:', results.videos.length)
  console.log('Testimonials found:', results.testimonials.length)
  console.log('Files checked:', results.files.length)
  
  if (results.videos.length > 0) {
    console.log('\n🎥 Videos:')
    results.videos.forEach(v => {
      console.log(`  - ${v.url} (from ${v.source})`)
    })
  }
  
  if (results.testimonials.length > 0) {
    console.log('\n💬 Testimonials:')
    console.log(JSON.stringify(results.testimonials, null, 2))
  }
  
  // Save to file
  fs.writeFileSync(
    'testimonials-found.json',
    JSON.stringify(results, null, 2)
  )
  console.log('\n✅ Results saved to testimonials-found.json')
}

module.exports = { findTestimonials }

