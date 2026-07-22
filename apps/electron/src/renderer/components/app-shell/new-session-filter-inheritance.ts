export type SessionFilterMode = 'include' | 'exclude'

export interface NewSessionFilterInheritanceInput {
  statuses: ReadonlyMap<string, SessionFilterMode>
  labels: ReadonlyMap<string, SessionFilterMode>
  projects: ReadonlyMap<string, SessionFilterMode>
}

export interface InheritedNewSessionParams {
  status?: string
  label?: string
  project?: string
}

/**
 * Resolve an unambiguous positive filter into metadata for a new session.
 *
 * Exclusion filters only describe what the list hides; they must never become
 * metadata on a newly created session. For example, `done: exclude` means
 * "hide completed sessions", not "create this session as completed".
 */
export function resolveInheritedNewSessionParams({
  statuses,
  labels,
  projects,
}: NewSessionFilterInheritanceInput): InheritedNewSessionParams | null {
  const included: InheritedNewSessionParams[] = []

  for (const [status, mode] of statuses) {
    if (mode === 'include') included.push({ status })
  }
  for (const [label, mode] of labels) {
    if (mode === 'include') included.push({ label })
  }
  for (const [project, mode] of projects) {
    if (mode === 'include') included.push({ project })
  }

  return included.length === 1 ? included[0] : null
}
