# Improvements

## How this document is organized

For each area, this records three things: **what I noticed**, **what I chose to fix**, and **why**.

## Triage quality and recommended actions

### What I noticed

- The LLM received an unconstrained request and returned free-form text.
- The app inferred categories by searching that prose for words such as “billing” and “feature.”
- Recommended actions came from a static category lookup. In particular, Feature Request incorrectly pointed to the billing portal.

### What I chose to fix

- Required structured JSON from the LLM: category, urgency, concise reasoning, and a message-specific recommended action.
- Validated the returned category, urgency, and required text fields before accepting an LLM response.
- Added clear category/routing instructions to the system prompt.

### Why

Free-form parsing is ambiguous and can select the wrong category when a message contains multiple concepts. A validated schema makes downstream behavior predictable, and a tailored action makes the triage result useful to a support agent.

## Fallback triage when the LLM is unavailable

### What I noticed

- The previous fallback used broad substring checks and randomized explanatory text.
- It could return an incorrect generic action and had no complete result shape.
- The app did not explicitly avoid an LLM request when the API key was missing.

### What I chose to fix

- Added a deterministic rule-based fallback with category, urgency, reasoning, recommended action, and source fields.
- Added explicit precedence: outages and loss of access take priority over billing terms in mixed messages.
- Added message-specific fallback actions for outages, access issues, performance, billing, feature requests, and general questions.
- Used the fallback immediately when the API key is absent and after failed or invalid LLM responses.
- Added acceptance tests for the documented fallback cases and determinism.

### Why

Support triage must remain useful when the AI provider is unavailable. Deterministic rules produce repeatable, explainable results and give the UI the same data shape regardless of the triage source.

## Urgency

### What I noticed

- The original scorer penalized short messages, all-caps text, weekends, and off-hours.
- It did not recognize critical operational signals such as outages, blocked access, or a device that will not start.
- High urgency was therefore rare and often unrelated to real impact.

### What I chose to fix

- Added structured LLM urgency when available.
- Replaced the fallback scorer with severity signals for outages, blocked work, access loss, payment impact, product faults, and explicit urgency.
- Removed message length, time-of-day, weekend, and punctuation as primary severity signals.

### Why

Urgency should represent customer impact and operational risk, not writing style or the current clock time.

## History and operational review

### What I noticed

- History was sorted alphabetically by message text.
- Users could filter only by category, not urgency.
- Clearing all history relied on a browser confirmation dialog.

### What I chose to fix

- Made newest-first the default sort and retained an optional A–Z control.
- Added independent category and urgency filters.
- Replaced the browser confirmation with an in-app, centered confirmation dialog with a red destructive-action button.

### Why

Support work is time-sensitive, and urgency is a core way to review a queue. The in-app confirmation is visually consistent with the product and communicates the irreversible action more clearly.

## Dashboard insights

### What I noticed

- The Insights panel could be blank for normal non-empty history because every message was behind a threshold condition.

### What I chose to fix

- Added an always-available top-category insight when history contains data.

### Why

An analytics panel should provide information whenever data exists, not only under exceptional volume or urgency conditions.

## Dark mode and accessibility

### What I noticed

- The app did not offer a theme preference.
- The initial dark-mode palette made the Home-page blue statistic fail contrast requirements and left the green card with low-contrast label text.

### What I chose to fix

- Added a persistent light/dark toggle beside Dashboard in the navigation bar.
- Applied dark-mode surfaces, text, borders, and form-field colors.
- Updated the Home statistic-card palette to WCAG-safe combinations and checked both light and dark contrast ratios.

### Why

Theme preference improves usability in low-light environments, but a dark mode is only useful when its content remains readable. The updated card colors meet the relevant WCAG AA thresholds for the evaluated text.

## Verification approach

### What I noticed

- The project initially had no automated fallback-triage tests.
- Existing lint findings in unrelated React-effect code prevented a clean lint run.

### What I chose to fix

- Added native Node test coverage for fallback acceptance cases and deterministic output.
- Ran production builds after implementation changes.
- Kept unrelated pre-existing lint findings out of focused changes.

### Why

The fallback rules need regression protection because small pattern changes can alter routing behavior. Focused verification confirms the implemented behavior without expanding the requested scope into unrelated refactors.
