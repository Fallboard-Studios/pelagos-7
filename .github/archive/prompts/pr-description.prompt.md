---
name: pr-description
description: Create PR description following project template
agent: agent
tools:
  ['read/readFile', 'search/changes']
---

Generate a concise PR description for this feature branch using the PR template from [CONTRIBUTION_GUIDE.md](../../docs/CONTRIBUTION_GUIDE.md).

## PR Template (Concise Format)

```markdown
## Description
Brief summary of what was implemented and why.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Tested locally
- [ ] TypeScript compiles
- [ ] No architectural violations

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed

## Related Issues
Closes #XX

Changes to Include
${input:changes:Describe the feature/changes in this PR}
${input:metadata:Optional METADATA JSON (pr_title, summary, changedFiles, detectedSize, todoList, issueNumber)}

Process
1. Prefer structured `metadata` when provided: if `${input:metadata}` exists, use `metadata.pr_title`, `metadata.summary`, `metadata.changedFiles`, `metadata.todoList`, and `metadata.detectedSize`. If not provided, fall back to `${input:changes}` and analyze changed files via `#tool:search/changes`.
2. Use `metadata.todoList` to populate the PR checklist and the `Changes to Include` section.
3. Set PR labels from `detectedSize` (e.g., `size/S`) and add any relevant component labels inferred from `changedFiles`.
4. Keep the PR description concise (1-2 sentences summary + checklist + related issues).
5. Return the PR description for review and also emit a machine-readable JSON object (see "Machine-readable output" below).

## Machine-readable output
When done, in addition to the human-readable PR body, return a JSON object with these keys:
- `pr_title` (string)
- `pr_body` (string)
- `labels` (array of strings)
- `checklist` (array of strings)
- `changedFiles` (array of strings)
- `metadata_used` (boolean)

Example:
```json
{
  "pr_title": "#42: Add OceanScene (size:M)",
  "pr_body": "Adds OceanScene with parallax layers and camera controls.\n\n## Checklist\n- Add unit tests for camera pan\n- Add TimeDisplay UI\n\nCloses #42",
  "labels": ["size/M","components"],
  "checklist": ["Add unit tests for camera pan","Add TimeDisplay UI"],
  "changedFiles": ["src/components/OceanScene.tsx","src/systems/cameraSystem.ts"],
  "metadata_used": true
}
```

Show the PR description for review.