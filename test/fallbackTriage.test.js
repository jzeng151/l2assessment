import test from 'node:test'
import assert from 'node:assert/strict'
import { getFallbackTriage } from '../src/utils/fallbackTriage.js'

const acceptanceCases = [
  {
    message: 'Can you add a dark mode?',
    category: 'Feature Request',
    urgency: 'Low',
    action: /product review/i
  },
  {
    message: "My computer won't turn on",
    category: 'Technical Problem',
    urgency: 'High',
    action: /escalate to technical support/i
  },
  {
    message: 'Server down now',
    category: 'Technical Problem',
    urgency: 'High',
    action: /technical incident/i
  },
  {
    message: "My payment failed and I can't access my account",
    category: 'Technical Problem',
    urgency: 'High',
    action: /restore access/i
  },
  {
    message: 'Could I get a copy of my invoice?',
    category: 'Billing Issue',
    urgency: 'Low',
    action: /invoice or receipt/i
  },
  {
    message: 'What are your business hours?',
    category: 'General Inquiry',
    urgency: 'Low',
    action: /business-hours/i
  }
]

for (const expected of acceptanceCases) {
  test(`fallback triages: ${expected.message}`, () => {
    const result = getFallbackTriage(expected.message)

    assert.equal(result.category, expected.category)
    assert.equal(result.urgency, expected.urgency)
    assert.match(result.recommendedAction, expected.action)
    assert.equal(result.source, 'fallback')
  })
}

test('fallback is deterministic and prioritizes product impact over billing', () => {
  const message = "My payment failed and I can't access my account"
  const firstResult = getFallbackTriage(message)

  assert.deepEqual(getFallbackTriage(message), firstResult)
  assert.match(firstResult.reasoning, /takes precedence over the billing signal/i)
})
