---
name: tufte-design-visualization
description: Apply Edward Tufte's principles when designing, reviewing, or implementing data visualisations, dashboards, analytical interfaces, and evidence-rich frontends. Use when the user asks for visualisation design, dashboard/UI critique, data presentation, analytical frontend design, chart selection, or Tufte-inspired design.
---

# Tufte Design & Visualization Skill

Use Edward Tufte's principles to design visualisations and frontends that are evidence-rich, honest, dense, comparative, and low in unnecessary chrome.

## Core stance

Design is a reasoning aid. The goal is not decorative minimalism; it is to help users compare, diagnose, explain, decide, and trust the evidence.

Translate Tufte's "least ink" to screens as: least unnecessary pixels, chrome, interaction cost, animation, and cognitive overhead.

## Two canonical lists to apply

Memorize and check work against both.

### Six principles of graphical integrity (VDQI)

1. Representation must be proportional to quantity. Lie Factor (size of effect in graphic / size of effect in data) should sit between 0.95 and 1.05.
2. Use clear, detailed, thorough labeling. Defeat distortion and ambiguity in the graphic itself.
3. Show data variation, not design variation.
4. Use standardized, deflated/normalized units for money in time series.
5. Information-carrying dimensions in the graphic must not exceed dimensions in the data. No 3D for 1D, no area for length.
6. Do not quote data out of context. Show enough surrounding range and history to judge what is unusual.

### Six fundamental principles of analytical design (Beautiful Evidence)

1. Show comparisons, contrasts, differences. "Compared to what?"
2. Show causality, mechanism, explanation, systematic structure. Reveal why, not just what.
3. Show multivariate data. Most real problems have ≥3 variables; flatten only with deliberate cost.
4. Completely integrate words, numbers, images, diagrams on the same surface.
5. Thoroughly describe the evidence: detailed title, author/sponsor, data sources, measurement scales, caveats. Trust is earned through visible provenance.
6. Content quality, relevance, and integrity decide success. Design cannot rescue weak evidence.

## When to use

Use this skill for:

- Charts, maps, tables, dashboards, reports, and analytical documents
- Frontend screens where users inspect data, status, metrics, logs, workflows, or evidence
- UI reviews focused on clarity, trust, density, hierarchy, or visual honesty
- Choosing between chart types or redesigning misleading charts
- Adding sparklines, small multiples, annotations, or evidence-rich tables

## First questions

Before designing, identify or ask briefly:

1. What decision, comparison, diagnosis, or explanation must the user make?
2. What data is available: variables, units, time range, denominator, uncertainty, missingness, freshness, source?
3. Who is the viewer: novice, expert, executive, operator, analyst?
4. What constraints exist: framework, screen size, accessibility, performance, existing design system?

If the user asks for immediate implementation, state assumptions succinctly and proceed.

## Required principles

### 1. Above all else, show the data

Make evidence the dominant visual element. Navigation, containers, filters, legends, and decoration are secondary.

- Do not hide essential values behind hover-only interactions.
- Prefer direct labels over remote legends.
- Keep units, time range, source, and update freshness visible.

### 2. Maximise signal-to-chrome ratio

Remove or soften anything that does not help reasoning:

- Heavy borders, filled cards, redundant headings, ornamental icons, glossy effects, thick gridlines, gratuitous shadows, decorative animation.
- Keep context: labels, scales, reference lines, annotations, uncertainty, caveats.

### 3. Tell the truth visually

Guard graphical integrity. Apply the Lie Factor test: graphic effect size / data effect size should be ~1.0 (target 0.95–1.05).

- Use honest baselines and consistent scales for comparisons.
- Make normalization, aggregation, smoothing, filters, denominators, and missing data explicit.
- Avoid 3D, area/volume encodings for 1D values, and misleading truncation.
- Show uncertainty when it affects interpretation.
- Deflate or normalize money in time series; nominal currency lies.
- Never quote data out of context — show enough surrounding range/history that the viewer can judge what is unusual.

### 4. Make comparisons local

Quantitative reasoning is comparison.

- Put comparable things adjacent.
- Use shared scales and aligned baselines.
- Add prior period, target, benchmark, peer group, distribution, or forecast where useful.
- Avoid splitting comparison across tabs, pages, modals, or carousel slides.

### 5. Use high density with structure

Density is good when organized. Most modern dashboards are under-dense, not over-dense.

- Prefer compact evidence-rich views over sparse dashboards of isolated cards.
- Use tables with inline bars/sparklines when exact lookup and scanning both matter.
- For small N, a sorted table with sparklines often dominates a chart.
- Let overview and detail coexist.

### 5b. Embed graphics in prose and tables

Sparklines and word-sized graphics are first-class. Graphics should embed in the flow of words and numbers at sentence resolution, not be segregated into figures with cross-references.

- Inline trends in tables, alerts, toasts, and KPI rows.
- A headline number alone is impoverished — pair with sparkline + reference levels (min, max, normal band, target, current).
- Match graphic resolution to medium: word-sized for sentence-level evidence, full-size for full arguments.

### 6. Use small multiples

For repeated comparisons across category, time, geography, scenario, or condition, use small multiples.

- Keep scales consistent unless local scaling is explicitly justified.
- Sort panels meaningfully.
- Reduce repeated axes and let differences dominate.

### 7. Design micro/macro readings

The screen should work at two levels:

- Macro: overall pattern, health, trend, distribution, or anomaly.
- Micro: exact values, annotations, outliers, sources, caveats.

### 8. Layer and separate

Use the smallest effective visual difference. Every added border, divider, or contrast generates compounding visual interactions (Albers' 1+1=3): the cost of decoration is super-linear.

- Push support layers back with light lines, muted text, and subtle spacing.
- Pull evidence and active annotations forward.
- Prefer position, alignment, proximity, and type hierarchy before strong color.
- Let the data choose aspect ratio (Cleveland's banking to ~45° for time series); do not force charts into square dashboard cells.

### 9. Use color semantically

Color is scarce. Tufte/Bertin name four uses: (1) to label (categorical), (2) to measure (sequential/diverging), (3) to imitate reality, (4) to enliven/decorate. Spend saturation on the first three.

- Reserve saturation for meaning: category, state, warning, selection, anomaly.
- Use earth tones and grays for context; reserve strong color for highlight.
- Use stable color semantics across screens.
- Use accessible palettes; never encode by hue alone.
- Forbid rainbow/jet palettes for ordered data — they are not perceptually uniform and induce false categories.

### 10. Annotate directly

Words, numbers, and graphics should reinforce one another.

- Label lines, outliers, events, thresholds, and regime changes near the relevant mark.
- Place conclusions beside supporting evidence.
- Keep source/caveat notes visible but subordinate.

### 11. Let interaction add resolution

Interaction should reveal more evidence, not compensate for an empty base view.

Good: sort, filter with visible state, brush/link, zoom with orientation, detail-on-demand for secondary info.
Bad: hover-only essentials, hidden filters, comparison carousels, slow decorative transitions.

### 12. Show causality and mechanism, not just outcomes

For diagnostic and analytical screens, show *why*, not only *what*. Snow's cholera map and the Challenger O-ring analysis are Tufte's canonical examples.

- Pair outcome metrics with contributing breakdowns, drivers, or upstream signals.
- Annotate regime changes, deploys, incidents, and policy changes on time series.
- Prefer evidence sequences over claim sequences.

### 13. Make provenance visible

From analytical-design principle 5: every analytical screen should answer, without the user asking — where did this come from, when was it updated, what is included/excluded, who owns it, what are the caveats. Provenance is a required UI element, not metadata.

## Chart selection heuristics

- Exact lookup/audit: table, possibly with inline bars or sparklines.
- Change over ordered domain: line chart, slopegraph, horizon/sparkline for compact context.
- Ranking/magnitude: sorted bars or dot plot.
- Distribution: histogram, dot plot, box/violin only if audience understands it.
- Part-to-whole with many categories: sorted bars, not pie/donut.
- Repeated groups over same structure: small multiples.
- Geography: map only when spatial position matters; otherwise use ranked tables/charts.
- Process/causality: annotated timeline or evidence sequence.

## Slideware pathology

Tufte's PowerPoint critique generalizes directly to modern UIs. A dashboard of isolated KPI cards is a slideware deck: low resolution per panel, fragmented comparison, decorative chrome, claim-led rather than evidence-led. The Columbia accident analysis (2003) is the canonical case — critical uncertainty buried in a nested bullet list. Recognize the pattern in card grids, tabbed analytics, and accordion reports.

## Named anti-patterns

Detect and name these in reviews:

- **Duck Card** — metric card whose chrome (icon, gradient, badge) outweighs its data.
- **Slideware Dashboard** — one chart per panel, no shared scale, navigated by tabs.
- **Hover Trap** — essential values hidden behind hover; unreachable on touch/print.
- **Mystery Filter** — applied filters not visible in the result view.
- **Rainbow Heatmap** — ordered quantity encoded across a non-uniform hue palette.
- **Floating Number** — KPI with no comparison, trend, or reference level.
- **Carousel of Truth** — comparisons broken across slides/tabs/modals.
- **Truncated Triumph** — y-axis baseline chosen to inflate change.
- **Decorative Animation** — motion that delays rather than reveals.
- **Bullet Cascade** — nested bullets where prose, tables, or graphics belong.

## Frontend application

For analytical frontends:

- Replace isolated KPI cards with value + trend + target + delta + denominator.
- Prefer evidence modules over decorative cards.
- Keep filter scope, data freshness, permissions, and error states visible.
- Put actions next to the evidence they affect.
- Support expert throughput: keyboard access, compact density, sorting, bulk actions, stable layout.
- Avoid slideware thinking: one claim per screen, oversized metrics, hidden evidence, fragmented context.

## Review checklist

Ask before finalizing:

1. What is the main reasoning task?
2. What comparison is easiest? What comparison is too hard?
3. What evidence is hidden behind interaction?
4. What non-evidence is visually loud?
5. Are baselines, scales, units, denominators, and source honest?
6. Are uncertainty, missingness, filters, and freshness visible?
7. Does color encode meaning consistently?
8. Can the screen be read both as overview and detail?
9. Could more useful evidence fit if chrome were reduced?
10. Would an expert trust and use this repeatedly?

## Output expectations

When producing designs or code:

- Briefly name the reasoning task and display strategy.
- Use semantic, accessible markup and responsive layouts.
- Tokenize styling where applicable.
- Include honest labels, units, source/freshness placeholders, and empty/error/stale states when relevant.
- Explain any deliberate tradeoff, especially when using local scales, aggregation, hidden detail, or dense layouts.
