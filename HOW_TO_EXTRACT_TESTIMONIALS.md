# How to Extract Testimonials - Step by Step

## Quick Steps

### 1. Open Terminal/Command Prompt

- **Windows:** Press `Win + R`, type `cmd`, press Enter
- **Mac/Linux:** Open Terminal app

### 2. Navigate to Website Repository

```bash
# If you haven't cloned it yet:
git clone https://github.com/ojocoachingacademy-byte/ojocoachingacademy
cd ojocoachingacademy

# If you already have it cloned, just navigate there:
cd ojocoachingacademy
```

### 3. Run the Extraction Script

**Option A: If you have the app repo in a sibling folder:**
```bash
node ../ojo-coaching-academy-app/scripts/extract-testimonials-from-folder.js
```

**Option B: If the app repo is elsewhere, copy the script:**
```bash
# Copy the script to website repo
cp ../ojo-coaching-academy-app/scripts/extract-testimonials-from-folder.js scripts/
node scripts/extract-testimonials-from-folder.js
```

**Option C: Run directly from app repo (if you're there):**
```bash
# From app repo directory
cd ../ojocoachingacademy
node ../ojo-coaching-academy-app/scripts/extract-testimonials-from-folder.js
```

### 4. Check the Output

The script will:
- Print results to the terminal
- Create a file: `testimonials-extracted.json`

### 5. Share the Results

**Copy and paste here:**
- The terminal output, OR
- The contents of `testimonials-extracted.json` file

## What You'll See

The terminal will show something like:
```
🔍 Scanning folder: Photos-and-videos

📁 Found 5 files and 0 folders

🎥 Video files: 2
🖼️  Image files: 2
📄 JSON files: 0
🌐 HTML files: 0
📝 Text files: 1

📊 Extraction Results:

✅ Found 2 testimonials

1. John Doe
   Video: john-doe-testimonial.mp4

2. Jane Smith
   Video: jane-smith-review.mp4

✅ Results saved to: testimonials-extracted.json
```

## If You Get Errors

**Error: "Folder not found"**
- Make sure you're in the website repo root directory
- Check that `Photos-and-videos` folder exists

**Error: "node: command not found"**
- Install Node.js from https://nodejs.org/
- Or just share the file list manually

**Error: "Cannot find module"**
- Make sure you're running from the correct directory
- Or copy the script file to the website repo first

## Alternative: Manual Method

If the script doesn't work, just:
1. List the files in `Photos-and-videos` folder
2. Share the filenames here
3. Tell me the student names for each video
4. I'll create the import data for you

## Next Steps After Extraction

Once you share the results, I'll:
1. Review the extracted data
2. Create the import JSON
3. Help you import to the app
4. Set up the full integration

Ready? Run the script and paste the output here! 🚀

