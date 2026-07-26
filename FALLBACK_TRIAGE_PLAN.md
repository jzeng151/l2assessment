# Hard-Coded Triage Fallback Plan

## Objective

Provide predictable, useful triage when the Groq key is missing, the API request fails, or the model response cannot be validated. The fallback must return the same shape as LLM triage:

```js
{
  category: 'Billing Issue' | 'Technical Problem' | 'Feature Request' | 'General Inquiry',
  urgency: 'High' | 'Medium' | 'Low',
  reasoning: string,
  recommendedAction: string
}
```

## Implementation sequence

1. Detect unavailable LLM configuration before creating a request, and use the fallback directly. Keep the existing catch path for request, timeout, and response-validation failures.
2. Replace broad substring checks with a maintained rule table: category, ordered phrase/regex signals, exclusions, confidence, and an action template family.
3. Apply explicit precedence for mixed messages. Safety, outages, and loss of access should win over billing vocabulary; a billing issue with no product-impact signal remains Billing Issue.
4. Rework fallback actions into message-specific branches. For example, distinguish login/access failures, outages, slow performance, refunds, payment failures, feature requests, and informational questions. Add high-urgency escalation guidance.
5. Make the fallback scorer use severity signals only—customer impact, blocked access, outages, security/data risk, payment impact, and explicit urgency. Do not use message length, time of day, weekend, or punctuation as primary severity signals.
6. Generate short deterministic reason strings from the matched rules, including the winning signal and any precedence decision. This makes fallback results explainable without randomized copy.
7. Add unit tests for the rule table and end-to-end fallback results, including the examples below and ambiguous mixed messages.

## Initial acceptance cases

| Message | Expected category | Expected urgency | Expected action theme |
| --- | --- | --- | --- |
| `Can you add a dark mode?` | Feature Request | Low | Send to product review / capture use case |
| `My computer won't turn on` | Technical Problem | High | Escalate to technical support |
| `Server down now` | Technical Problem | High | Incident escalation and status check |
| `My payment failed and I can't access my account` | Technical Problem | High | Restore access, investigate payment as contributing issue |
| `Could I get a copy of my invoice?` | Billing Issue | Low | Provide invoice retrieval guidance |
| `What are your business hours?` | General Inquiry | Low | Provide business-hours information |

## Guardrails

- Keep fallback behavior deterministic: the same message must produce the same result.
- Normalize whitespace/case and support phrase boundaries to avoid accidental matches.
- Record which path produced the result (`llm` or `fallback`) for troubleshooting, but do not expose secrets or raw provider errors to users.
- Keep the rules and tests together so additions to the support taxonomy require coverage.
