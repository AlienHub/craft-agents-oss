import { describe, expect, it } from 'bun:test'
import { summarizeAutomationTestResult } from '../useAutomations'

describe('summarizeAutomationTestResult', () => {
  it('returns waiting_for_confirmation when Run Test stops at an approval gate', () => {
    const result = summarizeAutomationTestResult({
      waitingForConfirmation: true,
      actions: [
        { type: 'prompt', success: true, sessionId: 'session-1', duration: 10 },
        { type: 'confirm', success: true, sessionId: 'session-1', duration: 1, waitingForConfirmation: true },
      ],
    })

    expect(result).toEqual({
      state: 'waiting_for_confirmation',
      duration: 11,
    })
  })

  it('keeps failed actions as errors even when a confirmation result is present', () => {
    const result = summarizeAutomationTestResult({
      actions: [
        { type: 'confirm', success: false, stderr: 'Approval workflows must use action order: prompt -> confirm -> follow-up actions', duration: 0 },
      ],
    })

    expect(result).toEqual({
      state: 'error',
      stderr: 'Approval workflows must use action order: prompt -> confirm -> follow-up actions',
    })
  })
})
