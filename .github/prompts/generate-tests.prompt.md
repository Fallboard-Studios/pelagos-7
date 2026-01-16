---
name: generate-tests
description: Create Vitest tests following project patterns
agent: agent
tools:
  - read_file
  - file_search
  - create_file
---

Generate Vitest tests for ${file} following [CONTRIBUTION_GUIDE.md](../../docs/CONTRIBUTION_GUIDE.md) testing patterns.

## Test File Location

Tests live alongside source files:
```
src/
  engine/
    beatClock.ts
    beatClock.test.ts       ← Create here
```

## What to Test

**✅ Test these:**
- Utility functions (math, helpers)
- Core engine logic (BeatClock, harmonySystem)
- State management actions (store mutations)
- Algorithm logic (melody generation, collision detection)

**❌ Skip these:**
- React components (visual testing sufficient)
- GSAP timeline integration (mocking too complex)
- Tone.js audio scheduling (manual testing better)
- Simple getters/setters

## Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from './module';

describe('ModuleName', () => {
  describe('functionToTest', () => {
    it('describes expected behavior', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('handles edge case', () => {
      const result = functionToTest(edgeCaseInput);
      expect(result).toBe(expectedEdgeCase);
    });
  });
});
```

## Store Testing Pattern

```typescript
import { beforeEach } from 'vitest';
import { useOceanStore } from './oceanStore';

beforeEach(() => {
  useOceanStore.setState({ robots: [], actors: [] });
});

it('maintains serializable state', () => {
  const state = useOceanStore.getState();
  expect(() => JSON.stringify(state)).not.toThrow();
});
```

## Implementation Steps

1. Read the source file to understand what to test
2. Search for existing test files to match patterns
3. Generate tests covering:
   - Normal/happy path cases
   - Edge cases (empty, null, boundary values)
   - Error conditions
4. Include setup/teardown if needed (beforeEach, afterEach)
5. Show tests before creating file

**Coverage goal:** 70-80% for utilities/stores (don't obsess over 100%)
