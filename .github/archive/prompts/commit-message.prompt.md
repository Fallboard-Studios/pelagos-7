---
name: commit-message
description: Generate commit message following project conventions
agent: agent
tools:
  ['search/changes']
---

Generate a commit message for these changes following [CONTRIBUTION_GUIDE.md](../../docs/CONTRIBUTION_GUIDE.md) format.

## Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

### Scope
Component or system affected: `audio`, `animation`, `state`, `components`, `engine`, `types`, etc.

### Subject
- Imperative mood ("add" not "added" or "adds")
- No period at end
- Max 50 characters

### Body
- Explain what and why (not how)
- Wrap at 72 characters
- Bullet points okay
- Never use double quotes, use backticks for code references or single quotes as needed

### Footer
- Reference issues: `Closes #42`, `Fixes #67`, `Part of #23`
- Breaking changes: `BREAKING CHANGE: description`

## Examples

```
feat(audio): add harmony system with 24-hour palette rotation

- Implement TIME_PITCHES mapping for hourly harmony changes
- Add getAvailableNotes() for runtime palette access
- Schedule harmony updates via BeatClock

Closes #42
```

```
fix(animation): prevent timeline leak on robot removal

Robots weren't killing timelines on unmount, causing memory leak
and stale animation references.

- Add killTimeline() call in cleanup
- Store timeline refs in timelineMap, not state

Fixes #67
```

## Machine-readable output

When done, in addition to the human-readable message, return a JSON object with these keys:
- `commit_subject` (string)
- `commit_message` (string)
- `scope` (string)
- `metadata_used` (boolean)

Example JSON (append to your response):

```json
{ "commit_subject": "feat(audio): add harmony system",
  "commit_message": "feat(audio): add harmony system with 24-hour palette rotation\n\n- Implement TIME_PITCHES mapping\n\nCloses #42",
  "scope": "audio",
  "metadata_used": true
}
```

## Process

1. Prefer structured `metadata` when provided: if `${input:metadata}` exists, use `metadata.summary`, `metadata.changedFiles`, and `metadata.detectedSize` to populate subject/body/scope. If not provided, fall back to analyzing `${input:changes}` (git diff).
2. Get changed files (from metadata.changedFiles or search/changes) to infer `scope` (use first path segment, e.g. `src/components` → `components`).
3. Determine `type` (feat/fix/test/etc.) from the change intent and files.
4. Generate a concise commit subject (<50 chars) and full commit message (body + footer). If an issue number is present in metadata or diff, add `Closes #NN` in the footer.
5. Return the human-readable commit message for review and also emit a machine-readable JSON object (see "Machine-readable output" above).
6. Show message for review before using.

${input:changes:Describe changes or paste git diff}
${input:metadata:Optional METADATA JSON (summary, changedFiles, detectedSize, issueNumber)}
