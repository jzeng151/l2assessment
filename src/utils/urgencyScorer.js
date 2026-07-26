const HIGH_SEVERITY_SIGNALS = [
  { pattern: /\b(server|service|system|website|app|dashboard)\s+(is )?(down|offline|unavailable)\b/, label: 'service outage' },
  { pattern: /\b(outage|production incident|data loss|security breach)\b/, label: 'critical impact' },
  { pattern: /won't turn on|cannot turn on|can't turn on/, label: 'device unavailable' },
  { pattern: /\b(completely blocked|unable to work)\b/, label: 'work blocked' }
]

const MEDIUM_SEVERITY_SIGNALS = [
  { pattern: /\b(can't|cannot|unable to)\s+(access|log in)|\blocked out\b|\baccount suspended\b/, label: 'loss of access' },
  { pattern: /\b(payment failed|payment declined|charged twice|charged multiple times)\b/, label: 'payment impact' },
  { pattern: /\b(urgent|asap|immediately|critical)\b/, label: 'explicit urgency' },
  { pattern: /\b(error|crash|failed|not working|broken|timeout|slow|problem)\b/, label: 'product malfunction' }
]

export function getUrgencyAssessment(message) {
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, ' ').trim()
  const highSignal = HIGH_SEVERITY_SIGNALS.find(({ pattern }) => pattern.test(normalizedMessage))
  if (highSignal) return { urgency: 'High', signalLabel: highSignal.label }

  const mediumSignals = MEDIUM_SEVERITY_SIGNALS.filter(({ pattern }) => pattern.test(normalizedMessage))
  if (mediumSignals.length >= 2) {
    return { urgency: 'High', signalLabel: mediumSignals.map(({ label }) => label).join(' and ') }
  }
  if (mediumSignals.length === 1) return { urgency: 'Medium', signalLabel: mediumSignals[0].label }

  return { urgency: 'Low', signalLabel: 'no impact or incident signal' }
}

export function calculateUrgency(message) {
  return getUrgencyAssessment(message).urgency
}
