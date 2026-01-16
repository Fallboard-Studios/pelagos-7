---
name: commit-message
description: Generate commit message following project conventions
agent: agent
tools:
  - get_changed_files
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

## Process

1. Get changed files to understand scope
2. Analyze changes to determine type and impact
3. Generate commit message
4. Show message for review before using

${input:changes:Describe changes or paste git diff}
