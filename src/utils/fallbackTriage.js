import { getUrgencyAssessment } from './urgencyScorer.js'

const CATEGORY_RULES = [
  {
    category: 'Technical Problem',
    confidence: 'high',
    actionFamily: 'technical',
    signals: [
      { pattern: /\b(server|service|system|website|app|dashboard)\s+(is )?(down|offline|unavailable)\b/, label: 'service outage' },
      { pattern: /\b(outage|production incident|data loss|security breach)\b/, label: 'critical incident' },
      { pattern: /\b(can't|cannot|unable to)\s+(access|log in)|\blocked out\b|\blocked\b/, label: 'loss of access' },
      { pattern: /won't turn on|cannot turn on|can't turn on/, label: 'device will not start' },
      { pattern: /\b(error|bug|crash|timeout|not working|broken|loading|slow|performance)\b/, label: 'product malfunction' }
    ]
  },
  {
    category: 'Billing Issue',
    confidence: 'high',
    actionFamily: 'billing',
    signals: [
      { pattern: /\b(invoice|receipt|billing|subscription|plan|refund)\b/, label: 'billing request' },
      { pattern: /\b(payment|credit card|charge|charged|declined)\b/, label: 'payment issue' }
    ]
  },
  {
    category: 'Feature Request',
    confidence: 'medium',
    actionFamily: 'feature',
    signals: [
      { pattern: /\b(feature request|feature|enhancement|suggestion)\b/, label: 'feature request' },
      { pattern: /\b(can you|could you|please)\s+(add|support|include)\b/, label: 'requested capability' },
      { pattern: /\b(would like|wish|would be great)\b/, label: 'requested improvement' }
    ]
  }
]

function normalize(message) {
  return message.toLowerCase().replace(/\s+/g, ' ').trim()
}

function findRuleMatch(message) {
  for (const rule of CATEGORY_RULES) {
    const signal = rule.signals.find(({ pattern }) => pattern.test(message))
    if (signal) return { rule, signal }
  }

  return {
    rule: {
      category: 'General Inquiry',
      confidence: 'low',
      actionFamily: 'general'
    },
    signal: { label: 'no specialized support signal' }
  }
}

function getRecommendedAction(actionFamily, message) {
  if (actionFamily === 'technical') {
    if (/\b(down|offline|unavailable|outage|production incident)\b/.test(message)) {
      return 'Escalate as a technical incident, check service status, and keep the customer updated.'
    }
    if (/\b(can't|cannot|unable to)\s+(access|log in)|\blocked out\b|\blocked\b/.test(message)) {
      return 'Escalate to technical support to restore access and capture the affected account and any error details.'
    }
    if (/won't turn on|cannot turn on|can't turn on/.test(message)) {
      return 'Escalate to technical support for immediate troubleshooting and collect device details.'
    }
    if (/\b(slow|performance)\b/.test(message)) {
      return 'Collect browser, page, and timing details, then route to technical support for performance investigation.'
    }
    return 'Collect reproduction steps and any error details, then route the issue to technical support.'
  }

  if (actionFamily === 'billing') {
    if (/\b(invoice|receipt)\b/.test(message)) return 'Provide invoice or receipt retrieval guidance and verify the billing account.'
    if (/\b(refund)\b/.test(message)) return 'Review the refund request against policy and route it to billing support.'
    if (/\b(payment|credit card|charge|charged|declined)\b/.test(message)) return 'Verify payment details, explain the payment status, and route unresolved issues to billing support.'
    return 'Route the request to billing support with the relevant account and subscription details.'
  }

  if (actionFamily === 'feature') {
    return 'Route to product review, capture the customer use case, and acknowledge the feature request.'
  }

  if (/\b(hours|open|close)\b/.test(message)) return 'Provide the current business-hours information.'
  return 'Respond with the relevant support information or route for manual review if more context is needed.'
}

/**
 * Deterministic triage used when the LLM is unavailable or returns invalid data.
 */
export function getFallbackTriage(message) {
  const normalizedMessage = normalize(message)
  const { rule, signal } = findRuleMatch(normalizedMessage)
  const { urgency, signalLabel: urgencySignal } = getUrgencyAssessment(normalizedMessage)
  const hasBillingSignal = CATEGORY_RULES[1].signals.some(({ pattern }) => pattern.test(normalizedMessage))
  const precedenceNote = rule.category === 'Technical Problem' && hasBillingSignal
    ? ' Technical impact takes precedence over the billing signal.'
    : ''
  const escalation = urgency === 'High' && !getRecommendedAction(rule.actionFamily, normalizedMessage).startsWith('Escalate')
    ? ' Escalate for expedited handling.'
    : ''

  return {
    category: rule.category,
    urgency,
    reasoning: `Fallback matched ${signal.label}; urgency is ${urgency} based on ${urgencySignal}.${precedenceNote}`,
    recommendedAction: `${getRecommendedAction(rule.actionFamily, normalizedMessage)}${escalation}`,
    source: 'fallback'
  }
}
