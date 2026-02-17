---
name: new-feature
description: Plan and implement a feature from a GitHub issue following project architecture
agent: agent
tools:
  ['read', 'edit', 'search/changes', 'web', 'gitkraken/git_branch', 'gitkraken/git_checkout']
---

I want to implement a feature from a GitHub issue.

**Issue number:** ${input:issue:Enter GitHub issue number (e.g., 5, 8, 42)}

## Workflow

1. **Create feature branch**
   - Determine branch name from issue type and the issue `size:` label (use the issue label when present; fallback to user input or `M`). See CONTRIBUTION_GUIDE.md branch naming.
   - Branch name template: `feature/<short-title>-size-<S|M|L|XL>` — include detected size in the branch name and PR title/labels.
   - Run: `git checkout -b <branch-name>`
   - Example: `git checkout -b feature/ocean-scene-component-size-M`

2. **Fetch the issue**
   - Fetch issue details from https://github.com/Fallboard-Studios/pelagos-7/issues/{issue} (via GitHub API).
   - Detect `size:` label: if a label matches `^size:\s*(S|M|L|XL)$` use that value as `detectedSize` and apply it to branch/PR metadata; if no size label exists default to `M`.
   - Summarize: title, description, acceptance criteria, implementation details, and labels (include detected size).
   - Map detected size to PR/branch templates and add the corresponding `size/*` label to the PR.

3. **Review documentation**
   - Identify which system docs are relevant (AUDIO_SYSTEM.md, BEAT_CLOCK.md, HARMONY_SYSTEM.md, etc.)
   - Read architecture constraints from copilot-instructions.md
   - Review CONTRIBUTION_GUIDE.md for code patterns
   - Check related files mentioned in the issue

4. **Analyze implementation**
   - Check what files need to be created/modified
   - Identify architectural constraints (no classes, no setTimeout, etc.)
   - Note dependencies on other systems
   - Consider what already exists vs. what's needed

5. **Ask clarifying questions**
   - If anything is unclear about requirements
   - If there are multiple valid approaches
   - If implementation conflicts with existing code
   - If acceptance criteria are ambiguous

6. **Describe solution**
   - Explain approach in 2-3 sentences
   - List files to create/modify
   - Note key architectural decisions
   - Highlight any deviations from issue spec (with justification)

7. **Create todo list** (if multi-step)
   - Break down into atomic tasks
   - Order tasks logically
   - Each task should be completable in one action

8. **Ask permission to proceed**
   - "Should I implement this solution?"
   - "Do you want me to adjust the plan first?"

## Important Rules

- **Follow issue spec exactly** - don't over-implement
- **Use functional patterns** - no classes unless absolutely necessary
- **Check existing implementation** - file might already exist
- **Cite documentation** - reference specific sections when explaining decisions
- **Be concise** - summaries should be brief, not exhaustive
- **Respect issue size label** — if the issue has a `size:` label, treat it as authoritative for estimate/branch/PR labels; only prompt the user when missing.

9. **Generate commit message & PR metadata (machine-readable)**

- After the implementation plan is approved and changes are staged, produce a small, machine-readable `METADATA` JSON object that downstream prompts will consume. This metadata MUST include the following keys:
  - `branch_name` (string) — e.g. `feature/ocean-scene-size-M`
  - `pr_title` (string) — e.g. `#42: Add OceanScene (size:M)`
  - `commit_subject` (string) — short commit subject (imperative, <50 chars)
  - `commit_body` (string, optional) — brief explanation / footer (e.g., `Closes #42`)
  - `detectedSize` (string) — `S`|`M`|`L`|`XL` (from issue label or fallback)
  - `shortTitle` (string) — human readable short title
  - `slug` (string) — URL/branch friendly slug for titles
  - `changedFiles` (array of strings) — paths of files to include in PR
  - `todoList` (array of strings) — atomic follow-up tasks (for PR body checklists)
  - `summary` (string) — 1-2 sentence summary for PR/commit

- Return `METADATA` as a JSON code block in your response. Example:

```json
{
  "branch_name": "feature/ocean-scene-size-M",
  "pr_title": "#42: Add OceanScene (size:M)",
  "commit_subject": "feat(components): add OceanScene component",
  "commit_body": "Implement OceanScene with parallax layers and camera controls.\nCloses #42",
  "detectedSize": "M",
  "shortTitle": "Add OceanScene",
  "slug": "add-ocean-scene",
  "changedFiles": ["src/components/OceanScene.tsx","src/systems/cameraSystem.ts"],
  "todoList": ["Add unit tests for camera pan","Add TimeDisplay UI"],
  "summary": "Adds OceanScene component with parallax layers, camera pan/zoom and responsive layout."
}
```

- Use `METADATA` to invoke downstream prompts:
  - Call `commit-message` prompt with `${input:changes}` set to `METADATA.summary` + list of `changedFiles`.
  - Call `pr-description` prompt with `${input:changes}` set to `METADATA.summary`, `todoList`, `detectedSize`, and `changedFiles`.

- If the user prefers manual control, return `METADATA` and wait for confirmation before calling the commit/PR prompts.

Start by following the workflow above, beginning with creating the feature branch for issue #{issue}.