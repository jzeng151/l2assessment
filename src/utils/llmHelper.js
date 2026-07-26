import Groq from 'groq-sdk';
import { getFallbackTriage } from './fallbackTriage.js';

/**
 * LLM Helper for categorizing customer support messages
 * Using Groq API for AI-powered categorization
 */

const apiKey = import.meta.env.VITE_GROQ_API_KEY;
const groq = apiKey
  ? new Groq({ apiKey, dangerouslyAllowBrowser: true })
  : null;

/**
 * Categorize a customer support message using Groq AI
 * 
 * @param {string} message - The customer support message
 * @returns {Promise<{category: string, urgency: string, reasoning: string, recommendedAction: string, source: 'llm' | 'fallback'}>}
 */
export async function categorizeMessage(message) {
  if (!groq) return getFallbackTriage(message);

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
      typeof triage.reasoning !== 'string' || !triage.reasoning.trim() ||
      typeof triage.recommendedAction !== 'string' || !triage.recommendedAction.trim()) {
      throw new Error('Groq returned an invalid triage response');
    }

    return {
      category: triage.category,
      urgency: triage.urgency,
      reasoning: triage.reasoning.trim(),
      recommendedAction: triage.recommendedAction.trim(),
      source: 'llm'
    };
  } catch {
    console.warn('Groq triage unavailable; using deterministic fallback.');
    return getFallbackTriage(message);
  }
}
