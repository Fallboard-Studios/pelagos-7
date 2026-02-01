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

Process
Analyze changed files using #tool:get_changed_files
Write concise description (1-2 sentences)
Check only relevant boxes (omit obvious ones)
Focus on what matters for review
Reference related issues
Show the PR description for review.