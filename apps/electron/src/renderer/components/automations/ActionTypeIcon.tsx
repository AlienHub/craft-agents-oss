import { ClipboardCheck, MessageSquare, Webhook } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationAction } from './types'

export function ActionTypeIcon({ type, className }: { type: AutomationAction['type']; className?: string }) {
  const Icon = type === 'webhook' ? Webhook : type === 'confirm' ? ClipboardCheck : MessageSquare
  return <Icon className={cn('text-foreground/50', className)} />
}
