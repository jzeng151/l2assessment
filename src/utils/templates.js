/**
 * Recommendation Templates - Maps categories (and sub-issues) to recommended actions
 *
 * Default per-category action. getRecommendedAction overrides these with more
 * specific guidance when the message matches a known sub-issue.
 */
const actionTemplates = {
  "Billing Issue": "Ask the user to check the billing portal for charges, invoices, or payment methods.",
  "Technical Problem": "Suggest basic troubleshooting (refresh, clear cache, restart browser); escalate if unresolved.",
  "General Inquiry": "Respond with the relevant FAQ/help-doc link.",
  "Feature Request": "Log the request in the product feedback backlog and thank the customer.",
  "Unknown": "Review manually and route to the appropriate team."
}

const HIGH_URGENCY_PREFIX = 'Priority (High urgency): escalate to a human agent. '

const matches = (text, terms) => terms.some(term => text.includes(term))

function technicalAction(text) {
  if (matches(text, ['down', 'outage', 'production', "can't access", 'cannot access', 'inaccessible', 'unavailable']))
    return "Acknowledge a possible outage, link the status page, and escalate to engineering."
  if (matches(text, ['log in', 'login', "can't log in", 'cannot log in', 'locked out', 'password', 'reset']))
    return "Verify account status and offer a password reset or account unlock."
  if (matches(text, ['slow', 'lag', 'laggy', 'sluggish', 'performance']))
    return "Share performance troubleshooting: clear the cache, check the network connection, and try another browser or device."
  if (matches(text, ["won't load", 'not load', 'not loading', 'does not load', "doesn't load", 'fails to load', 'blank', 'white screen', 'error', 'timeout', 'timing out']))
    return "Suggest a hard refresh and clearing cache/cookies; if it persists, collect browser console errors and escalate."
  if (matches(text, ['crash', 'crashed', 'freeze', 'frozen']))
    return "Ask for steps to reproduce and any error details; escalate as a likely bug."
  return actionTemplates["Technical Problem"]
}

function billingAction(text) {
  if (matches(text, ['refund']))
    return "Review the refund request against policy and route to the billing team."
  if (matches(text, ['failed', 'declined', 'payment method', 'card expired', 'retry']))
    return "Ask the user to update their payment method in the billing portal and retry the charge."
  if (matches(text, ['upgrade', 'downgrade', 'plan', 'subscription', 'cancel']))
    return "Walk the user through plan changes or cancellation in the billing portal."
  if (matches(text, ['invoice', 'receipt', 'charge', 'overcharge', 'double']))
    return "Pull up the invoice or charge details and clarify or correct them as needed."
  return actionTemplates["Billing Issue"]
}

/**
 * Get recommended action for a given category, urgency, and message.
 *
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level ("High"|"Medium"|"Low")
 * @param {string} message - The original message (for sub-issue matching)
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category, urgency, message) {
  const text = (message || '').toLowerCase()

  let action
  switch (category) {
    case 'Technical Problem':
      action = technicalAction(text)
      break
    case 'Billing Issue':
      action = billingAction(text)
      break
    default:
      action = actionTemplates[category] || actionTemplates['Unknown']
  }

  // High-urgency issues should be routed to a human, not left as self-service.
  if (urgency === 'High' && !action.startsWith(HIGH_URGENCY_PREFIX)) {
    action = HIGH_URGENCY_PREFIX + action
  }
  return action
}

/**
 * Get all available categories
 * 
 * @returns {string[]} - List of categories
 */
export function getAvailableCategories() {
  return Object.keys(actionTemplates)
}

/**
 * Determines if message should be escalated
 * 
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level
 * @param {string} message - The original message
 * @returns {boolean} - Whether to escalate
 */
export function shouldEscalate(category, urgency, message) {
  return message.length > 100
}
