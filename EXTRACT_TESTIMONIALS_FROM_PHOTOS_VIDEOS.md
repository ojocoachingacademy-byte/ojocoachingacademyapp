# Extract Testimonials from Photos-and-Videos Folder

The testimonials are located in the `Photos-and-videos` folder in the website repository.

## Step 1: Check Folder Contents

The `Photos-and-videos` folder likely contains:
- Video files (`.mp4`, `.mov`, `.webm`, etc.)
- Possibly JSON/metadata files
- Possibly HTML files with testimonial info
- Image thumbnails

## Step 2: Identify Testimonial Structure

We need to determine:
1. **Video files:** What are the filenames? (e.g., `testimonial-1.mp4`, `john-doe-testimonial.mp4`)
2. **Metadata:** Is there a JSON file or HTML file with student names, text, etc.?
3. **Organization:** How are they organized? (one folder per testimonial? all in one folder?)

## Step 3: Extract Data

### Option A: If there's a metadata file

If there's a JSON or HTML file with testimonial data:

```json
[
  {
    "name": "Student Name",
    "video": "testimonial-1.mp4",
    "text": "Testimonial text...",
    "rating": 5,
    "date": "2024-01-15"
  }
]
```

### Option B: If videos are named with student names

If video files are named like:
- `john-doe-testimonial.mp4`
- `jane-smith-review.mp4`

We can extract names from filenames.

### Option C: If there's HTML/description files

If each testimonial has an HTML or text file with details.

## Step 4: Create Import Data

Once we have the structure, format it as:

```json
[
  {
    "name": "Student Name",
    "email": "student@example.com",  // if available
    "text": "Testimonial text...",   // if available
    "rating": 5,                      // if available, default 5
    "videoUrl": "https://your-site.netlify.app/Photos-and-videos/testimonial-1.mp4",
    "date": "2024-01-15",            // if available
    "featured": true                  // if you want to feature it
  }
]
```

## What I Need From You

Please share:

1. **List of files in Photos-and-videos folder:**
   - Video filenames
   - Any JSON/HTML/metadata files
   - Folder structure

2. **Testimonial details:**
   - Student names (for each video)
   - Testimonial text (if available)
   - Dates (if known)
   - Any other metadata

3. **Video URLs:**
   - Are they hosted on your website? (e.g., `https://ojocoachingacademy.netlify.app/Photos-and-videos/video.mp4`)
   - Or are they in a different location?

## Quick Extraction Script

If you can access the folder locally, you can run:

```bash
# List all files in Photos-and-videos
ls -la Photos-and-videos/

# Or if you want to see structure
find Photos-and-videos -type f
```

## Next Steps

Once you share:
- The file list from Photos-and-videos folder
- Student names for each video
- Any testimonial text/metadata

I'll create:
1. The exact import JSON
2. The import script
3. Instructions to run it

Or if you can share the folder structure/file list, I can help format it for import! 🚀

