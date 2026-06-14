/**
 * History persistence helper.
 *
 * Centralizes localStorage access for triaged messages so the storage key
 * and (de)serialization live in one place instead of being copy-pasted
 * across pages.
 */

const HISTORY_KEY = 'triageHistory'

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function addToHistory(item) {
  const history = loadHistory()
  history.push(item)
  saveHistory(history)
  return history
}

export function clearHistory() {
  saveHistory([])
}
