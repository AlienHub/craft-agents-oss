import { describe, expect, it, mock } from 'bun:test'
import { SessionManager } from './SessionManager'

describe('SessionManager automation continuation', () => {
  it('keeps remaining actions attached when a follow-up prompt reaches another confirm gate', async () => {
    const addedConfirmations: unknown[] = []
    const sentPrompts: string[] = []
    const managed: any = {
      id: 'session-1',
      workspace: { id: 'workspace-1', rootPath: '/tmp/workspace' },
      messages: [],
      enabledSourceSlugs: [],
    }
    const fakeManager = {
      addAutomationConfirmationToSession: mock(async (input: unknown) => {
        addedConfirmations.push(input)
        return { messageId: 'confirmation-2' }
      }),
      sendAutomationPromptInSession: mock(async (_managed: unknown, prompt: string) => {
        sentPrompts.push(prompt)
        return `output for ${prompt}`
      }),
    }

    const waitingForConfirmation = await (SessionManager.prototype as unknown as {
      executeAutomationContinuationActions: (
        managed: unknown,
        message: unknown,
        actions: unknown[],
      ) => Promise<boolean>
    }).executeAutomationContinuationActions.call(
      fakeManager,
      managed,
      {
        automationConfirmationMatcherId: 'automation-1',
        automationConfirmationContinuationEnv: {
          CRAFT_AUTOMATION_OUTPUT: 'first output',
          CRAFT_AUTOMATION_SESSION_ID: 'session-1',
        },
      },
      [
        { type: 'prompt', prompt: 'Prepare final summary' },
        { type: 'confirm', title: 'Send final summary?' },
        { type: 'webhook', url: 'https://example.com/final' },
      ],
    )

    expect(waitingForConfirmation).toBe(true)
    expect(sentPrompts).toEqual(['Prepare final summary'])
    expect(addedConfirmations).toHaveLength(1)
    expect(addedConfirmations[0]).toMatchObject({
      sessionId: 'session-1',
      matcherId: 'automation-1',
      title: 'Send final summary?',
      continuationEnv: {
        CRAFT_AUTOMATION_OUTPUT: 'output for Prepare final summary',
        CRAFT_AUTOMATION_SESSION_ID: 'session-1',
      },
      onConfirmActions: [
        { type: 'webhook', url: 'https://example.com/final' },
      ],
    })
  })
})
