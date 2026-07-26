import Groq from 'groq-sdk';

/**
 * LLM Helper for categorizing customer support messages
 * Using Groq API for AI-powered categorization
 */

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser-based calls (not recommended for production!)
});

/**
 * Categorize a customer support message using Groq AI
 * 
 * @param {string} message - The customer support message
 * @returns {Promise<{category: string, urgency: string | null, reasoning: string, recommendedAction: string | null}>}
 */
export async function categorizeMessage(message) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You triage customer-support messages. Return a JSON object with exactly these fields:
{"category":"Billing Issue|Technical Problem|Feature Request|General Inquiry","urgency":"High|Medium|Low","reasoning":"brief, message-specific explanation","recommendedAction":"specific next action for the support team"}.

Choose the primary customer need, not merely a keyword. Feature requests should be routed to product review, billing questions to billing support, technical faults to technical support, and general questions to the appropriate support response. Do not recommend checking the billing portal unless the message is about billing.`
        },
        {
          role: "user",
          content: message
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    const triage = JSON.parse(content);
    const categories = new Set([
      "Billing Issue",
      "Technical Problem",
      "Feature Request",
      "General Inquiry"
    ]);
    const urgencyLevels = new Set(["High", "Medium", "Low"]);

    if (!categories.has(triage.category) ||
      !urgencyLevels.has(triage.urgency) ||
      typeof triage.reasoning !== 'string' ||
      typeof triage.recommendedAction !== 'string') {
      throw new Error('Groq returned an invalid triage response');
    }

    return {
      category: triage.category,
      urgency: triage.urgency,
      reasoning: triage.reasoning.trim(),
      recommendedAction: triage.recommendedAction.trim()
    };
  } catch (error) {
    console.warn('Groq API failed, using mock response:', error.message);
    return getMockCategorization(message);
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
  
  // Billing-related detection
  if (lowerMessage.includes('bill') || lowerMessage.includes('payment') || 
      lowerMessage.includes('charge') || lowerMessage.includes('invoice') ||
      lowerMessage.includes('credit card') || lowerMessage.includes('subscription') ||
      lowerMessage.includes('refund') || lowerMessage.includes('cancel') && lowerMessage.includes('account')) {
    return {
      category: "Billing Issue",
      urgency: null,
      reasoning: getRandomReasoning('billing'),
      recommendedAction: null
    };
  }
  
  // Technical problem detection
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') || 
      lowerMessage.includes('broken') || lowerMessage.includes('not working') ||
      lowerMessage.includes('crash') || lowerMessage.includes('down') || 
      lowerMessage.includes('server') || lowerMessage.includes('loading') ||
      lowerMessage.includes('slow') || lowerMessage.includes('issue') ||
      lowerMessage.includes('problem') && !lowerMessage.includes('no problem')) {
    return {
      category: "Technical Problem",
      urgency: null,
      reasoning: getRandomReasoning('technical'),
      recommendedAction: null
    };
  }
  
  // Feature request detection
  if (lowerMessage.includes('feature') || lowerMessage.includes('add') && (lowerMessage.includes('please') || lowerMessage.includes('could')) ||
      lowerMessage.includes('improve') || lowerMessage.includes('would like to see') ||
      lowerMessage.includes('suggestion') || lowerMessage.includes('wish') ||
      lowerMessage.includes('could you') && lowerMessage.includes('add') ||
      lowerMessage.includes('enhancement') || lowerMessage.includes('would be great')) {
    return {
      category: "Feature Request",
      urgency: null,
      reasoning: getRandomReasoning('feature'),
      recommendedAction: null
    };
  }
  
  // Positive feedback detection
  if ((lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) &&
      !lowerMessage.includes('but') && !lowerMessage.includes('however')) {
    return {
      category: "General Inquiry",
      urgency: null,
      reasoning: getRandomReasoning('positive'),
      recommendedAction: null
    };
  }
  
  // Question/inquiry detection
  if (lowerMessage.includes('how') || lowerMessage.includes('what') || 
      lowerMessage.includes('when') || lowerMessage.includes('where') ||
      lowerMessage.includes('can i') || lowerMessage.includes('is there') ||
      lowerMessage.includes('?')) {
    return {
      category: "General Inquiry",
      urgency: null,
      reasoning: getRandomReasoning('inquiry'),
      recommendedAction: null
    };
  }
  
  // Fallback for ambiguous messages
  return {
    category: "General Inquiry",
    urgency: null,
    reasoning: getRandomReasoning('ambiguous'),
    recommendedAction: null
  };
}
