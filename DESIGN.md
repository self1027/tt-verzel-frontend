# Verzel Auction House — DESIGN.md

> **Direction:** Verzel Auction — Dark Editorial  
> **Purpose:** Permanent visual and interaction guidelines for the auction marketplace.

## 1. Intent and provenance

Build a distinctive auction marketplace that feels related to Verzel's technology brand while remaining a usable, trustworthy product. Auction lots and their photography are the protagonists; financial balances, bids, audit evidence and countdowns must be precise and legible.

**Observed source:** `design-tokens.css`, `design-tokens.scss`, `design-tokens.json` extracted from `https://www.verzel.com.br/pt/` using DesignAssets (24 October 2026). These files are references, **not** a verified official design system or a license to reproduce Verzel's assets. The extraction contains duplicate CSS/SCSS color keys, inconsistent values across formats, tiny sampled font sizes, and no spacing scale. The source does not establish exact layouts, component behavior, responsive rules, brand usage rights, or accessibility compliance.

**Project decisions:** All semantic roles, normalized sizes, spacing, component rules and accessibility constraints below are original proposals for Verzel Auction House, not claims about Verzel's official brand guidelines. Confirm any logo, photography or trademark usage permissions before public deployment.

## 2. Product principles

1. **The lot comes first.** Editorial photography and clear descriptions outweigh ornamental dashboards.
2. **Trust through precision.** Prices, bids, reservations, settlement and audit statuses must never be ambiguous.
3. **Dark editorial, not dark everywhere.** Use deep surfaces for brand moments and trading contexts; preserve readable, calm surfaces for dense content.
4. **Motion communicates state.** Animate only when it improves orientation, confirmation or real-time comprehension.
5. **Accessible by default.** Keyboard, contrast, reduced motion, touch targets and readable type are release requirements.
6. **Server truth wins.** Visual optimism must not imply a bid, transfer or audit verification has succeeded before the server confirms it.

## 3. Color foundations

### 3.1 Source-derived reference colors

| Reference | Hex | Interpretation |
|---|---|---|
| Graphite | `#15191E` | Primary dark background in extraction |
| Midnight purple | `#100C26` | Secondary deep background |
| Near black | `#000104` | Deepest backdrop |
| Electric lime | `#CBFA05` | Strong brand accent |
| Soft green | `#9FE870` | Secondary green accent |
| Deep violet | `#210E3F` | Extracted text/palette color |
| Muted slate | `#8B93A1` | Extracted muted text |
| White | `#FFFFFF` | Light background and text |
| Lavender | `#7D72FF` | Extracted palette candidate, not automatically a semantic action |
| Warm yellow | `#FBCE07` | Extracted palette candidate, not automatically a warning color |

The CSS repeats `--color-green`, `--color-blue`, `--color-dark-gray`, `--color-light-gray`, and `--color-purple`. **Do not import those repeated declarations as canonical tokens.** The JSON also differs from CSS/SCSS on several palette values. Retain raw files as provenance only.

### 3.2 Proposed semantic tokens — dark default

These are deliberate project decisions and may be refined after real screen testing.

| Token | Value | Usage |
|---|---|---|
| `--surface-canvas` | `#15191E` | App canvas |
| `--surface-raised` | `#1D2229` | Cards and elevated regions |
| `--surface-deep` | `#100C26` | Hero, focused auction modules |
| `--surface-inverse` | `#FFFFFF` | Light editorial panels |
| `--border-subtle` | `#363D47` | Low-emphasis separators |
| `--text-primary` | `#FFFFFF` | Primary text on dark |
| `--text-secondary` | `#B9C0CB` | Supporting text on dark |
| `--text-inverse` | `#15191E` | Text on light/lime |
| `--action-primary` | `#CBFA05` | Primary call to action |
| `--action-primary-hover` | `#D9FF45` | Hover state, verify contrast |
| `--accent-soft` | `#9FE870` | Secondary highlights |
| `--focus-ring` | `#CBFA05` | Keyboard focus on dark surfaces |

Do not encode semantic status solely by color. **Success, warning, danger, pending and unavailable** need dedicated tokens after contrast validation and must also include text/icon labels. Do not reuse lime to mean both “brand action” and “financial success” without context.

### 3.3 Light surfaces

Use `#FFFFFF` or a light neutral surface for product detail sections, tables and long-form explanations when it improves legibility. On light surfaces, use dark text (`#15191E`) and a separately tested dark focus ring. A future optional light theme must use semantic token overrides rather than scattered hex literals.

### 3.4 Color rules

- Lime is a scarce accent: primary actions, active state and meaningful emphasis; not every border or card.
- Avoid large blocks of bright lime behind paragraphs.
- Never communicate leading bidder, settlement, tampering or wallet balance by color alone.
- Check WCAG 2.2 AA contrast on **actual foreground/background pairs**: at least 4.5:1 for ordinary text, 3:1 for large text and relevant UI boundaries. Values in this document are **not pre-certified**.
- Ensure disabled controls remain understandable; avoid opacity-only feedback.

## 4. Typography

**Source-derived family:** `Hind Madurai`. Use as the primary candidate, with local/system sans-serif fallbacks. Confirm available weights and licensing before bundling font assets. Avoid the extracted 7–14 px sample sizes as application standards; they appear to be measurements from particular page elements, not a usable type scale.

**Proposed scale** (CSS `rem`, assuming browser default 16 px):

| Role | Size | Weight | Line height |
|---|---|---|---|
| Display | `clamp(2.75rem, 5vw, 5rem)` | 700 | 1.05 |
| H1 | `clamp(2.25rem, 4vw, 3.5rem)` | 700 | 1.12 |
| H2 | `clamp(1.75rem, 3vw, 2.5rem)` | 650–700 | 1.2 |
| H3 | `1.5rem` | 600–700 | 1.25 |
| Body | `1rem` | 400 | 1.5 |
| Body large | `1.125rem` | 400 | 1.5 |
| Small | `0.875rem` | 400–600 | 1.45 |
| Caption | `0.8125rem` | 500 | 1.4 |

Use tabular numerals for money, bids, countdowns and balances (`font-variant-numeric: tabular-nums`). Never sacrifice readable text sizes for visual density. Verify whether Hind Madurai supports the intended weights; use supported values or system fallbacks rather than assuming 650 exists.

## 5. Spacing, layout and geometry

**Proposed 4 px spacing grid:** `4, 8, 12, 16, 24, 32, 48, 64, 96` px. Favor consistent spacing tokens over arbitrary values.

- Content width: `min(100% - 2rem, 1280px)` on desktop, with generous side margins on wide screens.
- Editorial hero may exceed the standard content width only with an intentional composition.
- Lot images: preserve aspect ratio and avoid aggressive cropping of products; use `object-fit: contain` when product details matter.
- Dense financial sections should prioritize stable alignment, tabular numbers and scannable grouping.
- Start mobile-first. Test approximately 375, 768 and 1440 px widths; these are validation targets, not a substitute for content-driven breakpoints.
- Radius scale proposal: `4px` compact controls, `8px` standard, `16px` editorial cards, `9999px` pills. Do not reuse the extracted `sm: 50%` / `full: 18px` naming.
- Prefer subtle borders and elevation. Use luminous/glow shadows rarely, not as a universal card style.

## 6. Interaction and component behavior

These guidelines define how components should look and behave whenever they appear in the product.

### Lot cards

Emphasize product imagery, name, current bid/starting price, state and end time. Avoid excessive badges. Distinguish “starting price” from “current bid” explicitly. The entire card may be navigable if keyboard and nested controls remain accessible.

### Auction detail

Visual hierarchy: product → current price → next valid bid → time remaining → action → bid history. Provide a visible, non-color-only explanation of anti-sniping extensions and bid rejection. Countdown is indicative; server decides eligibility.

### Wallet and ledger

Clearly separate total, available and reserved amounts. Deposits, holds, captures and releases must use their actual API meanings. Do not represent held money as paid to the seller. Right-align numeric columns and format in `pt-BR`.

### Audit and public receipt

Show `VERIFIED`, `PENDING_ANCHOR`, `TAMPERED`, and `VERIFICATION_UNAVAILABLE` as distinct, clearly explained states. Pending/unavailable are **not** proof of tampering. An audit indicator must not promise stronger cryptographic guarantees than the backend provides. Receipt is available only under the backend's real contract.

### Forms and feedback

Visible labels, helpful constraints, inline validation, loading, success and error states. Confirm financial actions only on server acknowledgement. Use explicit empty, loading, offline and reconnection states. Provide accessible announcements for consequential real-time updates without overwhelming screen readers.

## 7. Motion principles

- Default: restrained transitions of approximately 120–240 ms, adjusted after real interaction testing.
- Animate bid updates, countdown extension, leading-bidder change and confirmation only to communicate what changed.
- Do not animate money values in ways that obscure the exact number.
- Avoid perpetual pulsing urgency or manipulative scarcity effects.
- Support `prefers-reduced-motion: reduce`, with essential state information remaining visible without animation.
- Favor transform/opacity over layout-thrashing animations; verify performance on mobile.

## 8. Responsive and accessibility contract

- WCAG 2.2 AA is the **target**, to be verified, not a claimed current achievement.
- Keyboard navigation, visible focus, semantic headings and accessible labels are mandatory.
- Target at least 24×24 CSS px for interactive targets or adequate spacing under WCAG 2.2 AA; prefer approximately 44×44 px for high-frequency mobile controls.
- Do not rely on hover to reveal essential information.
- Respect zoom/reflow and avoid horizontal scrolling of the page at narrow widths; isolated financial tables may scroll with clear affordances.
- Use accessible dialogs and non-destructive feedback for financial errors.

## 9. Design reference hierarchy

This document is the **single source of truth for accepted visual decisions**. External design references may inform refinements but should not silently override it.

1. **Awesome Claude Design** — inspiration and reference analysis; not an automatically authoritative design system.
2. **Taste Skill** — artistic direction and visual distinctiveness within the established identity.
3. **UI UX Pro Max** — UX patterns, information architecture, consistency and accessibility review.
4. **Frontend Design** — React/CSS composition, typography and visual execution without arbitrary rebranding.
5. **Design Motion Principles** — intentional animation and microinteraction review.
6. **Playwright MCP / Playwright tooling** — browser validation, visual inspection and functional tests; use whichever integration is actually installed and efficient.

**Conflict resolution:** accessibility and truthful product states > this accepted visual direction > artistic suggestions > implementation refinements > motion polish. Revisions should be deliberate and documented.

## 10. Visual quality checklist

- [ ] Typography is legible, expressive and consistent across screen sizes.
- [ ] Semantic color roles and contrast are checked in actual rendered contexts.
- [ ] Product photography and descriptions remain visually prominent.
- [ ] Prices, countdowns, bid states and financial information have clear labels.
- [ ] Loading, empty, error, offline and success states are visually distinguishable.
- [ ] Keyboard focus, touch targets, reflow and reduced-motion behavior are accessible.
- [ ] Components follow consistent spacing, radius, borders and interaction patterns.
- [ ] Statuses never rely on color alone or imply stronger guarantees than they represent.

---

**Design change policy:** update visual decisions intentionally and record the reason for material changes. Feature scope, route contracts, build steps and implementation phases belong outside this document.
