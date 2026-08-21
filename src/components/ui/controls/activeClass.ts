/**
 * Shared implementation behind the `isActive` CSS hook documented in
 * docs/COMPONENT_LIBRARY.md — appends a plain `isActive` class when a
 * component's represented state is "on", so a consumer can write
 * `.sc-toggle.isActive { ... }` instead of a `:has()` attribute selector.
 * Used by every primitive with on/off state (Toggle, StepperWithToggle,
 * Lfo, AccordionContainer).
 */
export function withActiveClass(base: string, active: boolean): string {
  return active ? `${base} isActive` : base;
}
