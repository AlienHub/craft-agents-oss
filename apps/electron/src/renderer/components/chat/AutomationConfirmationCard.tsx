import * as React from 'react'
import { CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Markdown } from '@/components/markdown'
import type { Message } from '../../../shared/types'

interface AutomationConfirmationCardProps {
  message: Message
  sessionId: string
  isInteractive?: boolean
}

export function AutomationConfirmationCard({
  message,
  sessionId,
  isInteractive = true,
}: AutomationConfirmationCardProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const status = message.automationConfirmationStatus ?? 'pending'
  const disabled = !isInteractive || isSubmitting || status !== 'pending'
  const title = message.automationConfirmationTitle || message.content || 'Confirmation required'
  const body = message.automationConfirmationBody || ''
  const confirmLabel = message.automationConfirmationConfirmLabel || 'Confirm'
  const cancelLabel = message.automationConfirmationCancelLabel || 'Cancel'

  const respond = React.useCallback(async (confirmed: boolean) => {
    if (disabled) return
    setIsSubmitting(true)
    try {
      await window.electronAPI.sessionCommand(sessionId, {
        type: 'respondAutomationConfirmation',
        messageId: message.id,
        confirmed,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [disabled, message.id, sessionId])

  const variantClass = status === 'confirmed'
    ? 'border-success/30 bg-success/5'
    : status === 'cancelled'
      ? 'border-muted-foreground/20 bg-muted/20'
      : 'border-border bg-background'

  return (
    <div className={cn('overflow-hidden rounded-[8px] border shadow-minimal', variantClass)}>
      <div className="flex gap-3 px-4 py-3">
        <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{title}</div>
          {body && (
            <div className="mt-2 text-sm text-muted-foreground">
              <Markdown>{body}</Markdown>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/50 px-3 py-2">
        {status === 'pending' ? (
          <>
            <Button
              size="sm"
              className="h-7 gap-1.5"
              onClick={() => respond(true)}
              disabled={disabled}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {confirmLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => respond(false)}
              disabled={disabled}
            >
              <XCircle className="h-3.5 w-3.5" />
              {cancelLabel}
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {status === 'confirmed' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Confirmed
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Cancelled
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export const MemoizedAutomationConfirmationCard = React.memo(
  AutomationConfirmationCard,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.automationConfirmationStatus === next.message.automationConfirmationStatus &&
    prev.isInteractive === next.isInteractive &&
    prev.sessionId === next.sessionId
)
