# Phase Spec: [Phase Name]

> **Execution Commands**
> - Build check: `npm run build`
> - Type check: `npm run build:types` (`tsc --noEmit`)
> - Lint: `npm run lint`
> - Unit tests: `npm test`
> - Dev server: `npm run dev`

---

## 1. Overview & Claude Explanation

[Paste the single-paragraph explanation built for Claude here.]

---

## 2. Target File Structure

```text
src/
├── data/
│   └── [phase]Config.ts
└── components/
    └── [phase]/
        └── [Component].tsx

```

---

## 3. Implementation Boundaries & Constraints

* **Strict Scope:** Touch ONLY the files listed in the Target File Structure above unless explicitly directed otherwise.
* **Protected Paths:** Never modify or delete files in `.env*`, `node_modules/`, or public build assets.
* **Zero Hardcoded Strings:** All UI labels, lore titles, ranges, and defaults MUST come directly from typed schemas in `src/data/`. Do not write raw display strings inside React components.

---

## 4. Code Style & Architecture Conventions

```typescript
// Example: Strict Schema-Driven Component Style
import type { ControlSchema } from '@/types/controls';
import { SliderLinear } from '@/components/ui/SliderLinear';
import './ExampleControl.css';

interface ExampleControlProps {
  config: ControlSchema;
  value: number;
  onChange: (val: number) => void;
}

export function ExampleControl({ config, value, onChange }: ExampleControlProps) {
  return (
    <div className="slider-linear-container">
      <SliderLinear
        id={config.id}
        humanLabel={config.labels.human}
        loreLabel={config.labels.lore}
        min={config.bounds.min}
        max={config.bounds.max}
        step={config.bounds.step}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

```

* **Naming Conventions:**
* Components: PascalCase (`AudioRigDrawer.tsx`)
* Data Configs: camelCase (`audioRigConfig.ts`)
* Types & Interfaces: PascalCase (`ControlSchema`)


* **Formatting:** Plain named function component exports (not `React.FC`), explicit prop interfaces, co-located plain CSS files per component (e.g. `SliderLinear.tsx` + `SliderLinear.css`), zero inline style objects unless calculating dynamic transform/attr values.

---

## 5. Testing & Verification Requirements

* **Framework:** Vitest + React Testing Library
* **Test File Location:** Colocate unit tests alongside implementation files (e.g. `beatClock.ts` → `beatClock.test.ts`, `[Component].tsx` → `[Component].test.tsx`).
* **Verification Steps:**
1. Run `npm run build:types` and confirm zero TypeScript compiler errors.
2. Run `npm run lint` and confirm zero ESLint errors.
3. Run `npm test` to verify unit test passes for pure utility math and state resolvers.
4. Run `npm run build` to ensure the production bundle builds cleanly.



---

## 6. Git & Workflow Context

* **Git Handling:** Human operator handles all branch creation, staging, commits, and merges manually.
* **Branch Convention:** `feature/[phase-slug]` (e.g., `feature/audio-rig`)
* **Commit Pattern:** No enforced conventional-commit format — short, imperative, descriptive sentences (e.g. `Add SliderLinear component and control schema types`).
