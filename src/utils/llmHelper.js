import Groq from 'groq-sdk';
import { calculateUrgency } from './urgencyScorer';
import { getRecommendedAction } from './templates';

/**
 * LLM Helper for categorizing customer support messages
 * Using Groq API for AI-powered categorization
 */

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser-based calls (not recommended for production!)
});

const VALID_CATEGORIES = ['Billing Issue', 'Technical Problem', 'Feature Request', 'General Inquiry'];
const VALID_URGENCIES = ['High', 'Medium', 'Low'];

const SYSTEM_PROMPT = `You are a customer support message triage assistant. Classify the user's message and respond with ONLY a JSON object (no markdown, no commentary) in this exact shape:

{"category": string, "reasoning": string, "urgency": string, "recommendedAction": string}

Rules:
- "category" must be exactly one of: ${VALID_CATEGORIES.join(', ')}.
- If a message touches more than one concern, pick the PRIMARY issue — the actual blocker or the customer's main ask. A payment/billing event whose real problem is that the customer cannot access or use the product is a "Technical Problem", not a "Billing Issue". Example: "our billing failed and we can't access our account" -> "Technical Problem".
- "reasoning": 1-3 short sentences for a support agent explaining the category and urgency choice.
- "urgency" must be exactly one of: "High", "Medium", "Low". Judge from impact AND tone. High: production outages, data loss, total loss of access, security issues, or an angry/frustrated customer. Medium: degraded functionality, billing that blocks work, time-sensitive but non-critical. Low: general questions, thanks, feature ideas, low-impact nits.
- "recommendedAction": one concrete next step for the support agent, TAILORED to this specific message — do not give a generic one-liner. Distinguish symptoms (e.g., "won't load" vs "loads slowly" warrant different steps). 1-2 sentences.`;

/**
 * Categorize a customer support message using Groq AI
 *
 * @param {string} message - The customer support message
 * @returns {Promise<{category: string, reasoning: string, urgency: string}>}
 */
export async function categorizeMessage(message) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Triage this customer support message:\n\n"""${message}"""` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const parsed = parseTriageResponse(response.choices[0].message.content);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'Unknown';
    const urgency = VALID_URGENCIES.includes(parsed.urgency) ? parsed.urgency : calculateUrgency(message);
    const recommendedAction =
      typeof parsed.recommendedAction === 'string' && parsed.recommendedAction.trim()
        ? parsed.recommendedAction.trim()
        : getRecommendedAction(category, urgency, message);
    return {
      category,
      reasoning: parsed.reasoning || 'No reasoning provided.',
      urgency,
      recommendedAction,
    };
  } catch (error) {
    console.warn('Groq API failed, using mock response:', error.message);
    return getMockCategorization(message);
  }
}

/**
 * Parse the model's JSON response defensively (handles code fences or
 * stray surrounding text if JSON mode is ever bypassed).
 */
function parseTriageResponse(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return {};
      }
    }
    return {};
  }
}

/**
 * Mock categorization for when API is unavailable
 */
function getMockCategorization(message) {
  const lowerMessage = message.toLowerCase();

  // Array of possible reasoning variations for each category
  const reasoningVariations = {
    billing: [
      "Based on keywords related to payments and billing, this appears to be a billing-related inquiry. The customer may need assistance with account charges or payment issues.",
      "This message contains billing terminology. The customer is likely experiencing issues with payments, invoices, or account charges.",
      "The message references financial matters related to the customer's account. This suggests a billing or payment concern that requires attention.",
    ],
    technical: [
      "This message describes technical difficulties or system errors. The customer is reporting functionality issues that may require engineering review.",
      "Based on error-related keywords, this appears to be a technical support issue. The customer is experiencing problems with product functionality.",
      "The message indicates a technical problem or bug. This requires investigation from the technical support team.",
      "System-related issues are mentioned in this message. The customer needs technical assistance to resolve functionality problems.",
    ],
    feature: [
      "This message suggests improvements or new functionality. The customer is providing product feedback and feature suggestions.",
      "The customer is requesting enhancements to the product. This appears to be a feature request that should be reviewed by the product team.",
      "Based on the language used, this seems to be a suggestion for product improvements rather than a support issue.",
    ],
    inquiry: [
      "This appears to be a general question about the product or service. The customer is seeking information or clarification.",
      "The message contains questions that don't indicate a specific problem. This is likely a general inquiry requiring informational support.",
      "Based on the question format, this seems to be an information request rather than a technical or billing issue.",
    ],
    positive: [
      "This message contains positive sentiment and appreciation. While not a support request, it may warrant acknowledgment.",
      "The customer is expressing satisfaction or gratitude. This doesn't appear to require immediate support action.",
    ],
    ambiguous: [
      "The message content is unclear or doesn't match standard support categories. Manual review may be needed for proper categorization.",
      "This message doesn't contain clear indicators for automatic categorization. Human review recommended.",
    ]
  };

  // Helper to get random reasoning
  const getRandomReasoning = (category) => {
    const reasons = reasoningVariations[category];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  // Urgency (rule-based) + a sub-issue-matched recommended action.
  const urgency = calculateUrgency(message);
  const build = (category, reasoningKey) => ({
    category,
    reasoning: getRandomReasoning(reasoningKey),
    urgency,
    recommendedAction: getRecommendedAction(category, urgency, message)
  });

  // Billing-related detection
  if (lowerMessage.includes('bill') || lowerMessage.includes('payment') ||
      lowerMessage.includes('charge') || lowerMessage.includes('invoice') ||
      lowerMessage.includes('credit card') || lowerMessage.includes('subscription') ||
      lowerMessage.includes('refund') || lowerMessage.includes('cancel') && lowerMessage.includes('account')) {
    return build("Billing Issue", 'billing');
  }

  // Technical problem detection
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') ||
      lowerMessage.includes('broken') || lowerMessage.includes('not working') ||
      lowerMessage.includes('crash') || lowerMessage.includes('down') ||
      lowerMessage.includes('server') || lowerMessage.includes('loading') ||
      lowerMessage.includes('slow') || lowerMessage.includes('issue') ||
      lowerMessage.includes('problem') && !lowerMessage.includes('no problem')) {
    return build("Technical Problem", 'technical');
  }

  // Feature request detection
  if (lowerMessage.includes('feature') || lowerMessage.includes('add') && (lowerMessage.includes('please') || lowerMessage.includes('could')) ||
      lowerMessage.includes('improve') || lowerMessage.includes('would like to see') ||
      lowerMessage.includes('suggestion') || lowerMessage.includes('wish') ||
      lowerMessage.includes('could you') && lowerMessage.includes('add') ||
      lowerMessage.includes('enhancement') || lowerMessage.includes('would be great')) {
    return build("Feature Request", 'feature');
  }

  // Positive feedback detection
  if ((lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) &&
      !lowerMessage.includes('but') && !lowerMessage.includes('however')) {
    return build("General Inquiry", 'positive');
  }

  // Question/inquiry detection
  if (lowerMessage.includes('how') || lowerMessage.includes('what') ||
      lowerMessage.includes('when') || lowerMessage.includes('where') ||
      lowerMessage.includes('can i') || lowerMessage.includes('is there') ||
      lowerMessage.includes('?')) {
    return build("General Inquiry", 'inquiry');
  }

  // Fallback for ambiguous messages
  return build("General Inquiry", 'ambiguous');
}
