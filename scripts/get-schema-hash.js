import fs from 'fs'

// Read from stdin if available (for git show), otherwise read from file
let data
try {
  if (process.stdin.isTTY) {
    // Read from file
    data = JSON.parse(fs.readFileSync('.schema-cache.json', 'utf8'))
  } else {
    // Read from stdin
    const chunks = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    const input = Buffer.concat(chunks).toString('utf8')
    data = JSON.parse(input)
  }
  console.log(data.hash || 'none')
} catch (error) {
  console.log('none')
}
