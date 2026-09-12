/**
 * Test-only helper (TYPE_SCALE.md Phase 2+) — extracts the trimmed
 * declaration body of a CSS rule or at-rule whose opening matches `selector`
 * exactly, e.g. '.sc-button' or '@container sc-control (max-width: 120px)'.
 * Returns null if no rule genuinely opens with that exact selector.
 *
 * A plain string `.toContain()` on a whole CSS file can't tell '.sc-button'
 * from '.sc-button-facade', or a declaration accidentally landing on the
 * wrong one of two same-file rules — this walks the source looking for a
 * real rule boundary instead: a match is only accepted when the text
 * immediately following `selector` is whitespace, a comma (more selectors in
 * a shared list), or the opening brace itself. A pseudo-class suffix
 * (':focus-visible'), a chained class ('.isActive'), an attribute selector
 * ('[data-x]'), a longer identifier ('-facade'), or a combinator into a
 * descendant/child selector ('.sc-button .sc-cabinet-box__front') are all
 * rejected as "not actually this selector's own rule" and the search moves
 * on to the next occurrence, if any.
 *
 * The body itself is extracted by brace-counting rather than a first-'}'
 * match, so an at-rule (@container) containing its own nested selector's
 * braces still returns its full, un-truncated content.
 */
export function getCssRuleBody(cssSource: string, selector: string): string | null {
  let searchFrom = 0;

  while (searchFrom <= cssSource.length) {
    const matchIndex = cssSource.indexOf(selector, searchFrom);
    if (matchIndex === -1) return null;

    const afterSelector = matchIndex + selector.length;
    searchFrom = afterSelector; // resume point if this occurrence doesn't pan out

    const nextChar = cssSource[afterSelector];
    if (nextChar !== undefined && !/[\s,{]/.test(nextChar)) {
      continue; // selector is only a substring of a longer token here
    }

    let i = afterSelector;
    while (i < cssSource.length && /\s/.test(cssSource[i])) i++;

    if (cssSource[i] === ',') {
      // One entry in a comma-separated selector list — find the '{' the
      // whole list shares. No nested braces can appear before it in a
      // selector list, so a plain indexOf is safe here.
      const braceIndex = cssSource.indexOf('{', i);
      if (braceIndex === -1) return null;
      i = braceIndex;
    }

    if (cssSource[i] !== '{') {
      continue; // e.g. a descendant/child combinator — not this rule
    }

    let depth = 1;
    let j = i + 1;
    for (; j < cssSource.length && depth > 0; j++) {
      if (cssSource[j] === '{') depth++;
      else if (cssSource[j] === '}') depth--;
    }
    if (depth !== 0) return null; // unbalanced braces — malformed CSS

    return cssSource.slice(i + 1, j - 1).trim();
  }

  return null;
}
