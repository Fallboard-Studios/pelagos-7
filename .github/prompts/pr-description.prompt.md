---
name: pr-description
description: Create PR description following project template
agent: agent
tools:
  - get_changed_files
  - read_file
---

Generate a PR description for this feature branch using the PR template from [CONTRIBUTION_GUIDE.md](../../docs/CONTRIBUTION_GUIDE.md).

## PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Tested locally
- [ ] No console errors
- [ ] Audio/animation working

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No architectural violations

## Related Issues
Closes #XX
```

## Changes to Include

${input:changes:Describe the feature/changes in this PR}

## Process

1. Analyze changed files using #tool:get_changed_files
2. Summarize key changes
3. Identify type of change (feature, fix, refactor, docs)
4. List testing performed
5. Check architectural compliance
6. Reference related issues
7. Generate complete PR description

Show the PR description for review.
