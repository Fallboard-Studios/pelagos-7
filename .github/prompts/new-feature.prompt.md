---
name: new-feature
description: Plan and implement a feature from a GitHub issue following project architecture
agent: agent
tools:
  ['read', 'edit', 'search/changes', 'web']
---

I want to implement a feature from a GitHub issue.

**Issue number:** ${input:issue:Enter GitHub issue number (e.g., 5, 8, 42)}

## Workflow

1. **Fetch the issue**
   - fetch issue details from https://github.com/Fallboard-Studios/pelagos-7/issues/{issue}
   - Summarize: title, description, acceptance criteria, implementation details

2. **Review documentation**
   - Identify which system docs are relevant (AUDIO_SYSTEM.md, BEAT_CLOCK.md, HARMONY_SYSTEM.md, etc.)
   - Read architecture constraints from copilot-instructions.md
   - Review CONTRIBUTION_GUIDE.md for code patterns
   - Check related files mentioned in the issue

3. **Analyze implementation**
   - Check what files need to be created/modified
   - Identify architectural constraints (no classes, no setTimeout, etc.)
   - Note dependencies on other systems
   - Consider what already exists vs. what's needed

4. **Ask clarifying questions**
   - If anything is unclear about requirements
   - If there are multiple valid approaches
   - If implementation conflicts with existing code
   - If acceptance criteria are ambiguous

5. **Describe solution**
   - Explain approach in 2-3 sentences
   - List files to create/modify
   - Note key architectural decisions
   - Highlight any deviations from issue spec (with justification)

6. **Create todo list** (if multi-step)
   - Break down into atomic tasks
   - Order tasks logically
   - Each task should be completable in one action

7. **Ask permission to proceed**
   - "Should I implement this solution?"
   - "Do you want me to adjust the plan first?"

## Important Rules

- **Follow issue spec exactly** - don't over-implement
- **Use functional patterns** - no classes unless absolutely necessary
- **Check existing implementation** - file might already exist
- **Cite documentation** - reference specific sections when explaining decisions
- **Be concise** - summaries should be brief, not exhaustive

Start by fetching issue #{issue} and working through the workflow above.