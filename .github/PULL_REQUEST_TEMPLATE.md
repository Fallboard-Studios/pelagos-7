## Summary
[Brief description of changes]

## Related Issues
Closes #[issue number]
Related to #[issue number]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Chore (dependencies, config, etc.)

## Implementation Details
[Key technical decisions or approach]

## Testing
- [ ] Tested locally (dev server runs)
- [ ] No console errors or warnings
- [ ] Tested on multiple viewports (if UI change)
- [ ] Audio works correctly (if audio change)
- [ ] Animation smooth (if animation change)

## Architecture Compliance
- [ ] Audio changes only in AudioEngine (no Tone.js elsewhere)
- [ ] Animation changes only in GSAP timelines (no timelines in state)
- [ ] State changes only in Zustand (no complex logic in components)
- [ ] No setTimeout/setInterval (used BeatClock/Transport)
- [ ] Types explicit (no `any`)
- [ ] Imports ordered correctly

## Code Quality
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No new TypeScript errors
- [ ] Code follows standards (see CONTRIBUTION_GUIDE.md)

## Screenshots / Demo
[If UI change, add before/after screenshots or GIF]

## Reviewers
@crawfordforbes

## Notes
[Any additional context, decisions, or follow-up needed]