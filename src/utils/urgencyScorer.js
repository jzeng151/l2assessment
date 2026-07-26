/**
 * Urgency Scorer - Rule-based urgency calculation
 */

export function calculateUrgency(message) {
  const normalizedMessage = message.toLowerCase()
  let urgencyScore = 10

  const hasAny = (patterns) => patterns.some(pattern => pattern.test(normalizedMessage))

  if (hasAny([
    /\b(server|service|system|website|app|dashboard)\s+(is )?(down|offline|unavailable)/,
    /\b(outage|production incident|data loss|security breach)\b/,
    /won't turn on|cannot turn on|can't turn on/,
    /completely (blocked|broken)|unable to work/
  ])) urgencyScore += 70

  if (hasAny([
    /can't access|cannot access|unable to access|locked out|cannot log in|can't log in/,
    /payment (failed|declined)|charged (twice|multiple times)|account suspended/,
    /urgent|asap|immediately|critical/
  ])) urgencyScore += 35

  if (hasAny([/error|crash|failed|not working|broken|timeout|slow|problem/])) urgencyScore += 20
  if (message === message.toUpperCase() && /[A-Z]/.test(message)) urgencyScore += 10
  urgencyScore += Math.min((message.match(/!/g) || []).length, 3) * 5

  if (hasAny([/thank(s| you)?|appreciate|happy|love|great|excellent|wonderful/])) urgencyScore -= 30
  if (hasAny([/feature request|would like|suggestion|feedback/])) urgencyScore -= 10

  if (urgencyScore >= 70) return "High"
  if (urgencyScore >= 35) return "Medium"
  return "Low"
}
