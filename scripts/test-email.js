/**
 * Quick script to test the send-email function locally.
 * Run: node scripts/test-email.js
 * Requires: dotenv (or ensure .env is loaded)
 */
import 'dotenv/config'
import { handler } from '../netlify/functions/send-email.js'

const testEmail = process.argv[2] || 'tobiojo10@gmail.com'

const event = {
  httpMethod: 'POST',
  body: JSON.stringify({
    to: testEmail,
    subject: 'Brevo Test from OJO',
    html: '<p>Brevo email integration is working! 🎾</p>'
  })
}

const result = await handler(event, {})
console.log('Status:', result.statusCode)
console.log('Body:', result.body)
