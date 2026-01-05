/**
 * Extract Testimonials from Photos-and-Videos Folder
 * 
 * This script helps extract testimonial data from the Photos-and-videos folder
 * in the website repository.
 * 
 * Usage:
 * 1. Clone website repo: git clone https://github.com/ojocoachingacademy-byte/ojocoachingacademy
 * 2. Navigate to repo: cd ojocoachingacademy
 * 3. Run: node ../ojo-coaching-academy-app/scripts/extract-testimonials-from-folder.js
 */

const fs = require('fs')
const path = require('path')

// Configuration
const PHOTOS_VIDEOS_FOLDER = 'Photos-and-videos'
const OUTPUT_FILE = 'testimonials-extracted.json'

// Video file extensions
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

function extractTestimonials(folderPath = PHOTOS_VIDEOS_FOLDER) {
  console.log(`🔍 Scanning folder: ${folderPath}\n`)

  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`)
    console.log('💡 Make sure you\'re in the website repository root directory')
    return null
  }

  const testimonials = []
  const files = []
  const folders = []

  // Read folder contents
  const entries = fs.readdirSync(folderPath, { withFileTypes: true })

  entries.forEach(entry => {
    const fullPath = path.join(folderPath, entry.name)
    
    if (entry.isFile()) {
      files.push({
        name: entry.name,
        path: fullPath,
        ext: path.extname(entry.name).toLowerCase()
      })
    } else if (entry.isDirectory()) {
      folders.push(entry.name)
    }
  })

  console.log(`📁 Found ${files.length} files and ${folders.length} folders\n`)

  // Find video files
  const videoFiles = files.filter(f => VIDEO_EXTENSIONS.includes(f.ext))
  const imageFiles = files.filter(f => IMAGE_EXTENSIONS.includes(f.ext))
  const jsonFiles = files.filter(f => f.ext === '.json')
  const htmlFiles = files.filter(f => f.ext === '.html' || f.ext === '.htm')
  const textFiles = files.filter(f => f.ext === '.txt' || f.ext === '.md')

  console.log(`🎥 Video files: ${videoFiles.length}`)
  console.log(`🖼️  Image files: ${imageFiles.length}`)
  console.log(`📄 JSON files: ${jsonFiles.length}`)
  console.log(`🌐 HTML files: ${htmlFiles.length}`)
  console.log(`📝 Text files: ${textFiles.length}\n`)

  // Process video files
  videoFiles.forEach((video, index) => {
    const testimonial = {
      id: index + 1,
      videoFile: video.name,
      videoPath: video.path,
      // Try to extract name from filename
      name: extractNameFromFilename(video.name),
      // Default values (to be filled manually or from metadata)
      email: null,
      text: null,
      rating: 5,
      date: null,
      featured: false,
      // Video URL (will be updated with actual website URL)
      videoUrl: null
    }

    // Look for associated metadata files
    const baseName = path.basename(video.name, path.extname(video.name))
    
    // Check for JSON file with same base name
    const jsonFile = jsonFiles.find(f => 
      path.basename(f.name, f.ext) === baseName
    )
    if (jsonFile) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonFile.path, 'utf8'))
        testimonial.name = jsonData.name || testimonial.name
        testimonial.email = jsonData.email || testimonial.email
        testimonial.text = jsonData.text || jsonData.testimonial || testimonial.text
        testimonial.rating = jsonData.rating || testimonial.rating
        testimonial.date = jsonData.date || jsonData.submitted_at || testimonial.date
        testimonial.featured = jsonData.featured || testimonial.featured
      } catch (e) {
        console.warn(`⚠️  Could not parse JSON file: ${jsonFile.name}`)
      }
    }

    // Check for HTML file with same base name
    const htmlFile = htmlFiles.find(f => 
      path.basename(f.name, f.ext) === baseName
    )
    if (htmlFile) {
      const htmlContent = fs.readFileSync(htmlFile.path, 'utf8')
      // Extract text from HTML (simple extraction)
      const textMatch = htmlContent.match(/<p[^>]*>([^<]+)<\/p>/i)
      if (textMatch) {
        testimonial.text = textMatch[1].trim()
      }
    }

    // Check for text file with same base name
    const textFile = textFiles.find(f => 
      path.basename(f.name, f.ext) === baseName
    )
    if (textFile) {
      testimonial.text = fs.readFileSync(textFile.path, 'utf8').trim()
    }

    testimonials.push(testimonial)
  })

  // If there's a single JSON file with all testimonials
  if (jsonFiles.length === 1 && videoFiles.length > 0) {
    try {
      const allData = JSON.parse(fs.readFileSync(jsonFiles[0].path, 'utf8'))
      if (Array.isArray(allData)) {
        console.log('📋 Found testimonial data in JSON file, merging...\n')
        // Merge JSON data with video files
        allData.forEach((data, index) => {
          if (testimonials[index]) {
            Object.assign(testimonials[index], data)
          }
        })
      }
    } catch (e) {
      console.warn(`⚠️  Could not parse testimonial JSON: ${e.message}`)
    }
  }

  return {
    testimonials,
    summary: {
      totalVideos: videoFiles.length,
      totalImages: imageFiles.length,
      totalTestimonials: testimonials.length,
      files: files.map(f => f.name),
      folders
    }
  }
}

function extractNameFromFilename(filename) {
  // Try to extract name from filename patterns like:
  // "john-doe-testimonial.mp4" -> "John Doe"
  // "testimonial-jane-smith.mp4" -> "Jane Smith"
  // "John_Doe_Review.mp4" -> "John Doe"
  
  const baseName = path.basename(filename, path.extname(filename))
  
  // Remove common prefixes/suffixes
  let cleaned = baseName
    .replace(/testimonial|review|video|vid/gi, '')
    .replace(/[-_]/g, ' ')
    .trim()
  
  // Capitalize words
  cleaned = cleaned.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  
  return cleaned || 'Unknown Student'
}

// Main execution
if (require.main === module) {
  const results = extractTestimonials()
  
  if (!results) {
    process.exit(1)
  }

  console.log('\n📊 Extraction Results:\n')
  console.log(`✅ Found ${results.testimonials.length} testimonials\n`)
  
  results.testimonials.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`)
    console.log(`   Video: ${t.videoFile}`)
    if (t.text) {
      console.log(`   Text: ${t.text.substring(0, 50)}...`)
    }
    console.log('')
  })

  // Save results
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(results.testimonials, null, 2)
  )
  
  console.log(`\n✅ Results saved to: ${OUTPUT_FILE}`)
  console.log('\n📝 Next steps:')
  console.log('1. Review the extracted data')
  console.log('2. Fill in missing information (email, text, dates)')
  console.log('3. Update videoUrl with actual website URLs')
  console.log('4. Use importWebsiteTestimonials() to import to app')
}

module.exports = { extractTestimonials, extractNameFromFilename }

