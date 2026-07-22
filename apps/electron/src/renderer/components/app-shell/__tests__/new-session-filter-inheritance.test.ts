import { describe, expect, test } from 'bun:test'
import { resolveInheritedNewSessionParams, type SessionFilterMode } from '../new-session-filter-inheritance'

function filters(entries: Array<[string, SessionFilterMode]> = []): Map<string, SessionFilterMode> {
  return new Map(entries)
}

describe('resolveInheritedNewSessionParams', () => {
  test('does not turn an excluded Done filter into a completed session', () => {
    expect(resolveInheritedNewSessionParams({
      statuses: filters([['done', 'exclude']]),
      labels: filters(),
      projects: filters(),
    })).toBeNull()
  })

  test('inherits a single included status', () => {
    expect(resolveInheritedNewSessionParams({
      statuses: filters([['done', 'include']]),
      labels: filters(),
      projects: filters(),
    })).toEqual({ status: 'done' })
  })

  test('inherits the sole positive filter while ignoring exclusions', () => {
    expect(resolveInheritedNewSessionParams({
      statuses: filters([['done', 'exclude']]),
      labels: filters([['customer', 'include'], ['internal', 'exclude']]),
      projects: filters([['archived-project', 'exclude']]),
    })).toEqual({ label: 'customer' })
  })

  test('supports an included project as the sole positive filter', () => {
    expect(resolveInheritedNewSessionParams({
      statuses: filters(),
      labels: filters(),
      projects: filters([['project-1', 'include']]),
    })).toEqual({ project: 'project-1' })
  })

  test('does not inherit ambiguous positive filters', () => {
    expect(resolveInheritedNewSessionParams({
      statuses: filters([['todo', 'include']]),
      labels: filters([['customer', 'include']]),
      projects: filters(),
    })).toBeNull()
  })

  test('returns null when there are no filters', () => {
    expect(resolveInheritedNewSessionParams({
      statuses: filters(),
      labels: filters(),
      projects: filters(),
    })).toBeNull()
  })
})
