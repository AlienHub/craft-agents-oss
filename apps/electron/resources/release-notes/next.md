# Pending Release Notes

This file accumulates release notes for the next unreleased version. PRs that add user-visible behavior should append a bullet to the relevant section here. Versioned files (`X.Y.Z.md`) are owned by the release skill — never create them in feature commits.

## Features

- **Projects** — Zo now supports workspace projects as a first-class navigation area, with project-bound sessions, project assets, project memory, per-project color treatment, and project context injected into bound agent sessions.
- **Kanban task board beta** — Zo gains a beta board for durable tasks, editable task cards, project-aware columns, acceptance criteria, subtask DAGs, and Conductor-driven multi-session task runs. Agents prepare work for review; users still decide when tasks are closed.
- **Background agents stay alive across turns** — background work can continue after the turn that launched it, with tracked status chips and completion surfacing when results arrive. The default remains enabled and can be disabled with `CRAFT_KEEP_BG_AGENTS_ALIVE=0`.

## Improvements

- **Pi SDK 0.80.3** — updates Pi dependencies to remove the hardcoded 20s SSE timeout that could cut off long OpenAI-protocol responses.
- **Project-aware localization and UI polish** — upstream Projects, Tasks, board controls, permission mode UI, browser toolbar strings, and related surfaces are localized across supported languages.

## Bug Fixes

- **macOS Local Network permission** — Zo now embeds the Local Network usage description so macOS can prompt for LAN access for local servers, local model endpoints, and LAN MCP servers.
- **Automation test timeout** — prompt automation tests no longer wait on full turn completion before returning, avoiding false 30s timeout failures.
- **Long label overflow** — very long session labels truncate in the sidebar instead of breaking the session list layout.

## Breaking Changes

- None. Background-agent keep-alive changes runtime behavior, but it remains opt-out via `CRAFT_KEEP_BG_AGENTS_ALIVE=0`.
