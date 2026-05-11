# Pending Release Notes

This file accumulates release notes for the next unreleased version. PRs that add user-visible behavior should append a bullet to the relevant section here. Versioned files (`X.Y.Z.md`) are owned by the release skill — never create them in feature commits.

## Features

## Improvements

- **Automation approval workflow guidance** — Updated the bundled automations guide, edit popover prompt, and session config validation tool description so agents learn the intended `prompt` → `confirm` → follow-up action pattern, including both webhook/API follow-ups and same-session prompt follow-ups.
- **Automation approval gate behavior** — Approval workflows now reject ambiguous `confirm`-first or multi-action pre-confirm shapes, keep follow-up actions attached across chained confirmation gates, and show Run Test as waiting for confirmation instead of passed when a card is pending.

## Bug Fixes

## Breaking Changes
