/**
 * Urgency Scorer - Rule-based urgency calculation
 *
 * Deterministic fallback used when the LLM urgency signal is unavailable
 * (API failure or invalid model output). The LLM path is primary; this
 * scorer exists so urgency is still sensible without network access.
 */

// Words/phrases that indicate a genuinely urgent situation or outage.
const URGENT_TERMS = [
  'urgent', 'asap', 'immediately', 'critical', 'emergency', 'down',
  'outage', 'production', 'deadline', 'stuck', 'locked out', 'lockout',
  "can't access", 'cannot access', 'cant access', 'no access',
  'broken', 'not working', "isn't working", 'crash', 'crashed',
  'data loss', 'lost data', 'security', 'breach', 'hacked',
  'failed', 'failure', 'unusable', 'cannot log in', "can't log in",
  "won't load", 'timing out', 'timeout',
]

// Words that signal an angry/frustrated customer — treat as higher urgency.
const FRUSTRATION_TERMS = [
  'angry', 'frustrated', 'unacceptable', 'ridiculous', 'furious',
  'outraged', 'disgusted', 'terrible', 'worst', 'fed up', 'fed-up',
  'joke', 'scam',
]

const POLITE_TERMS = ['please', 'thank', 'thanks', 'appreciate', 'kindly']
const POSITIVE_TERMS = ['happy', 'love', 'great', 'excellent', 'wonderful', 'amazing']

export function calculateUrgency(message) {
  const text = message.toLowerCase()
  let score = 50

  // Emphasis signals raise urgency.
  const exclamationCount = (message.match(/!/g) || []).length
  score += Math.min(exclamationCount, 5) * 6 // cap so a stray "!" can't dominate

  // ALL-CAPS reads as shouting / agitation, not calm.
  if (message === message.toUpperCase() && message.length > 10) {
    score += 20
  }

  // Content signals from the actual message.
  URGENT_TERMS.forEach(term => {
    if (text.includes(term)) score += 18
  })
  FRUSTRATION_TERMS.forEach(term => {
    if (text.includes(term)) score += 15
  })

  // Calm / low-impact signals lower urgency.
  POLITE_TERMS.forEach(term => {
    if (text.includes(term)) score -= 10
  })
  POSITIVE_TERMS.forEach(term => {
    if (text.includes(term)) score -= 15
  })
  if (text.includes('?')) score -= 12 // questions skew toward inquiries

  // Very short messages rarely carry an urgent situation.
  if (message.length < 20) score -= 15

  if (score >= 70) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}
