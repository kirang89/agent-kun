---
name: pi-overlay-extension
description: Build popup/overlay UI components for pi coding agent extensions. Use when creating pi extensions with floating modals, command palettes, dialogs, or any overlay-style UI.
---

# Building Pi Overlay Extensions

This skill teaches how to create popup/overlay UI components for pi coding agent extensions.

## Quick Start Template

```typescript
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import type { Component, Focusable, TUI } from "@mariozechner/pi-tui";
import { matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

class MyOverlayComponent implements Component, Focusable {
  private tui: TUI;
  private theme: Theme;
  private onDone: (result: string | null) => void;
  
  private _focused = false;
  get focused(): boolean { return this._focused; }
  set focused(value: boolean) { this._focused = value; }

  constructor(tui: TUI, theme: Theme, onDone: (result: string | null) => void) {
    this.tui = tui;
    this.theme = theme;
    this.onDone = onDone;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape")) {
      this.onDone(null);
      return;
    }
    if (matchesKey(data, "return")) {
      this.onDone("selected");
      return;
    }
    if (matchesKey(data, "up")) {
      // Handle up arrow
      this.tui.requestRender();
      return;
    }
    if (matchesKey(data, "down")) {
      // Handle down arrow
      this.tui.requestRender();
      return;
    }
  }

  invalidate(): void {}

  render(width: number): string[] {
    const th = this.theme;
    const innerW = width - 2; // Account for border characters
    const lines: string[] = [];

    // Helper to style borders
    const border = (s: string) => th.fg("border", s);
    
    // Top border with title
    const title = " My Overlay ";
    const titleW = visibleWidth(title);
    const leftPad = Math.floor((innerW - titleW) / 2);
    const rightPad = innerW - titleW - leftPad;
    lines.push(
      border("╭") + 
      border("─".repeat(leftPad)) + 
      th.fg("accent", title) + 
      border("─".repeat(rightPad)) + 
      border("╮")
    );

    // Empty line
    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Content lines
    const content = "Press Enter to confirm, Escape to cancel";
    const contentPadded = " " + content + " ".repeat(Math.max(0, innerW - content.length - 1));
    lines.push(border("│") + contentPadded + border("│"));

    // Empty line
    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Hint line
    const hint = th.fg("dim", "↑↓ navigate  enter select  esc cancel");
    const hintPadded = " " + hint + " ".repeat(Math.max(0, innerW - visibleWidth(hint) - 1));
    lines.push(border("│") + hintPadded + border("│"));

    // Bottom border
    lines.push(border("╰") + border("─".repeat(innerW)) + border("╯"));

    return lines;
  }
}

export default function myExtension(pi: ExtensionAPI) {
  pi.registerCommand("myoverlay", {
    description: "Show my overlay",
    handler: async (_args, ctx) => {
      const result = await ctx.ui.custom<string | null>(
        (tui, theme, _kb, done) => new MyOverlayComponent(tui, theme, done),
        {
          overlay: true,
          overlayOptions: {
            anchor: "center",
            width: 60,
          },
        }
      );
      
      if (result) {
        ctx.ui.notify(`Selected: ${result}`, "info");
      }
    },
  });
}
```

## Key Concepts

### 1. Component Interface

Overlay components must implement `Component` and `Focusable`:

```typescript
interface Component {
  render(width: number): string[];
  invalidate(): void;
  handleInput?(data: string): void;
}

interface Focusable {
  focused: boolean;
}
```

### 2. Overlay Options

```typescript
ctx.ui.custom<ResultType>(
  (tui, theme, keybindings, done) => new MyComponent(tui, theme, done),
  {
    overlay: true,
    overlayOptions: {
      // Anchor position (9 options)
      anchor: "center", // center, top-left, top-center, top-right,
                        // left-center, right-center, bottom-left,
                        // bottom-center, bottom-right
      
      // Size - USE PLAIN NUMBERS, not percentage strings
      width: 60,        // columns (required)
      maxHeight: 20,    // optional max height in rows
      
      // Offsets from anchor
      offsetX: 0,
      offsetY: 0,
      
      // Margins
      margin: 2,        // all sides
      // OR specific sides:
      margin: { top: 2, right: 2, bottom: 2, left: 2 },
    },
  }
);
```

### 3. Input Handling

Use `matchesKey` for reliable key detection:

```typescript
import { matchesKey } from "@mariozechner/pi-tui";

handleInput(data: string): void {
  if (matchesKey(data, "escape")) { /* ... */ }
  if (matchesKey(data, "return")) { /* ... */ }
  if (matchesKey(data, "up")) { /* ... */ }
  if (matchesKey(data, "down")) { /* ... */ }
  if (matchesKey(data, "backspace")) { /* ... */ }
  if (matchesKey(data, "tab")) { /* ... */ }
  
  // Printable characters
  if (data.length === 1 && data.charCodeAt(0) >= 32) {
    // Handle text input
  }
}
```

### 4. Triggering Re-renders

Call `tui.requestRender()` after state changes:

```typescript
handleInput(data: string): void {
  if (matchesKey(data, "down")) {
    this.selectedIndex++;
    this.tui.requestRender(); // Important!
  }
}
```

### 5. Theme Colors

Use the theme object for consistent styling:

```typescript
render(width: number): string[] {
  const th = this.theme;
  
  // Foreground colors
  th.fg("accent", text)      // Highlights (pink/accent color)
  th.fg("border", text)      // Box borders
  th.fg("muted", text)       // Secondary text
  th.fg("dim", text)         // Tertiary/hint text
  th.fg("success", text)     // Success (green)
  th.fg("error", text)       // Error (red)
  th.fg("warning", text)     // Warning (yellow)
  
  // Text styles
  th.bold(text)
  th.italic(text)
}
```

## Complete Example: Selection List Overlay

A command palette style overlay with fuzzy filtering:

```typescript
import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
import type { Component, Focusable, TUI } from "@mariozechner/pi-tui";
import { matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

interface ListItem {
  value: string;
  label: string;
  description?: string;
}

class SelectionOverlay implements Component, Focusable {
  private tui: TUI;
  private theme: Theme;
  private onDone: (result: ListItem | null) => void;
  
  private items: ListItem[];
  private filtered: ListItem[];
  private query = "";
  private selected = 0;

  private _focused = false;
  get focused(): boolean { return this._focused; }
  set focused(value: boolean) { this._focused = value; }

  constructor(
    items: ListItem[],
    tui: TUI,
    theme: Theme,
    onDone: (result: ListItem | null) => void
  ) {
    this.items = items;
    this.filtered = items;
    this.tui = tui;
    this.theme = theme;
    this.onDone = onDone;
  }

  private updateFilter(): void {
    const q = this.query.toLowerCase();
    this.filtered = this.items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
    );
    this.selected = 0;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape")) {
      this.onDone(null);
      return;
    }

    if (matchesKey(data, "return")) {
      const item = this.filtered[this.selected];
      this.onDone(item ?? null);
      return;
    }

    if (matchesKey(data, "up")) {
      if (this.filtered.length > 0) {
        this.selected = this.selected === 0 
          ? this.filtered.length - 1 
          : this.selected - 1;
      }
      this.tui.requestRender();
      return;
    }

    if (matchesKey(data, "down")) {
      if (this.filtered.length > 0) {
        this.selected = this.selected === this.filtered.length - 1 
          ? 0 
          : this.selected + 1;
      }
      this.tui.requestRender();
      return;
    }

    if (matchesKey(data, "backspace")) {
      if (this.query.length > 0) {
        this.query = this.query.slice(0, -1);
        this.updateFilter();
        this.tui.requestRender();
      }
      return;
    }

    // Printable character
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.query += data;
      this.updateFilter();
      this.tui.requestRender();
    }
  }

  invalidate(): void {}

  render(width: number): string[] {
    const th = this.theme;
    const innerW = width - 2;
    const lines: string[] = [];

    const border = (s: string) => th.fg("border", s);
    const padLine = (content: string) => {
      const w = visibleWidth(content);
      const padding = Math.max(0, innerW - w - 1);
      return " " + content + " ".repeat(padding);
    };

    // Top border with title
    const title = " Select Item ";
    const titleW = visibleWidth(title);
    const leftPad = Math.floor((innerW - titleW) / 2);
    const rightPad = innerW - titleW - leftPad;
    lines.push(
      border("╭") +
      border("─".repeat(leftPad)) +
      th.fg("accent", title) +
      border("─".repeat(rightPad)) +
      border("╮")
    );

    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Search input
    const cursor = th.fg("accent", "│");
    const searchIcon = th.fg("dim", "◎");
    const queryDisplay = this.query
      ? `${this.query}${cursor}`
      : `${cursor}${th.fg("dim", th.italic("type to filter..."))}`;
    lines.push(border("│") + padLine(`${searchIcon}  ${queryDisplay}`) + border("│"));

    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Divider
    lines.push(border("├") + border("─".repeat(innerW)) + border("┤"));

    // Items list
    const maxVisible = 8;
    const startIdx = Math.max(
      0,
      Math.min(this.selected - Math.floor(maxVisible / 2), this.filtered.length - maxVisible)
    );
    const endIdx = Math.min(startIdx + maxVisible, this.filtered.length);

    if (this.filtered.length === 0) {
      lines.push(border("│") + " ".repeat(innerW) + border("│"));
      lines.push(border("│") + padLine(th.fg("warning", "No matching items")) + border("│"));
      lines.push(border("│") + " ".repeat(innerW) + border("│"));
    } else {
      lines.push(border("│") + " ".repeat(innerW) + border("│"));
      
      for (let i = startIdx; i < endIdx; i++) {
        const item = this.filtered[i]!;
        const isSelected = i === this.selected;
        
        const prefix = isSelected ? th.fg("accent", "▸") : th.fg("border", "·");
        const label = isSelected 
          ? th.bold(th.fg("accent", item.label)) 
          : item.label;
        
        let line = `${prefix} ${label}`;
        
        if (item.description) {
          const descMaxLen = Math.max(0, innerW - visibleWidth(item.label) - 8);
          if (descMaxLen > 3) {
            const desc = truncateToWidth(item.description, descMaxLen, "…");
            line += `  ${th.fg("dim", "—")}  ${th.fg("muted", desc)}`;
          }
        }
        
        lines.push(border("│") + padLine(line) + border("│"));
      }
      
      lines.push(border("│") + " ".repeat(innerW) + border("│"));

      // Scroll indicator
      if (this.filtered.length > maxVisible) {
        const countStr = th.fg("dim", `${this.selected + 1}/${this.filtered.length}`);
        lines.push(border("│") + padLine(countStr) + border("│"));
        lines.push(border("│") + " ".repeat(innerW) + border("│"));
      }
    }

    // Divider
    lines.push(border("├") + border("─".repeat(innerW)) + border("┤"));

    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Hints
    const hints = th.fg("dim", "↑↓ navigate  enter select  esc cancel");
    lines.push(border("│") + padLine(hints) + border("│"));

    // Bottom border
    lines.push(border("╰") + border("─".repeat(innerW)) + border("╯"));

    return lines;
  }
}

export default function selectionExtension(pi: ExtensionAPI) {
  pi.registerCommand("pick", {
    description: "Pick an item from a list",
    handler: async (_args, ctx) => {
      const items: ListItem[] = [
        { value: "opt1", label: "Option 1", description: "First option" },
        { value: "opt2", label: "Option 2", description: "Second option" },
        { value: "opt3", label: "Option 3", description: "Third option" },
      ];

      const result = await ctx.ui.custom<ListItem | null>(
        (tui, theme, _kb, done) => new SelectionOverlay(items, tui, theme, done),
        {
          overlay: true,
          overlayOptions: { anchor: "center", width: 60 },
        }
      );

      if (result) {
        ctx.ui.notify(`Selected: ${result.label}`, "info");
      }
    },
  });
}
```

## Using Built-in SelectList

For simpler cases, use the built-in `SelectList` component:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { Component, Focusable, SelectItem, TUI } from "@mariozechner/pi-tui";
import { SelectList, visibleWidth } from "@mariozechner/pi-tui";

class SelectListOverlay implements Component, Focusable {
  private theme: Theme;
  private onDone: (result: string | null) => void;
  private selectList: SelectList;

  private _focused = false;
  get focused(): boolean { return this._focused; }
  set focused(value: boolean) {
    this._focused = value;
    (this.selectList as any).focused = value;
  }

  constructor(items: SelectItem[], theme: Theme, onDone: (result: string | null) => void) {
    this.theme = theme;
    this.onDone = onDone;
    
    this.selectList = new SelectList(
      items,
      Math.min(items.length, 10), // visible items
      {
        selectedPrefix: (t) => theme.fg("accent", t),
        selectedText: (t) => theme.fg("accent", t),
        description: (t) => theme.fg("muted", t),
        scrollInfo: (t) => theme.fg("dim", t),
        noMatch: (t) => theme.fg("warning", t),
      },
      { enableSearch: true }
    );

    this.selectList.onSelect = (item) => this.onDone(item.value);
    this.selectList.onCancel = () => this.onDone(null);
  }

  handleInput(data: string): void {
    this.selectList.handleInput(data);
  }

  invalidate(): void {
    this.selectList.invalidate?.();
  }

  render(width: number): string[] {
    const th = this.theme;
    const innerW = width - 2;
    const border = (s: string) => th.fg("border", s);
    const lines: string[] = [];

    // Top border
    const title = " Select ";
    const titleW = visibleWidth(title);
    const leftPad = Math.floor((innerW - titleW) / 2);
    const rightPad = innerW - titleW - leftPad;
    lines.push(
      border("╭") + border("─".repeat(leftPad)) + 
      th.fg("accent", title) + 
      border("─".repeat(rightPad)) + border("╮")
    );

    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Embed SelectList content
    const listLines = this.selectList.render(innerW);
    for (const line of listLines) {
      const truncated = line.slice(0, innerW);
      const lineW = visibleWidth(truncated);
      const padding = Math.max(0, innerW - lineW);
      lines.push(border("│") + truncated + " ".repeat(padding) + border("│"));
    }

    lines.push(border("│") + " ".repeat(innerW) + border("│"));

    // Bottom border
    lines.push(border("╰") + border("─".repeat(innerW)) + border("╯"));

    return lines;
  }
}
```

## Common Patterns

### Confirmation Dialog

```typescript
class ConfirmDialog implements Component, Focusable {
  private theme: Theme;
  private message: string;
  private onDone: (confirmed: boolean) => void;
  private selectedButton = 0; // 0 = Yes, 1 = No

  // ... focused getter/setter ...

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || data.toLowerCase() === "n") {
      this.onDone(false);
      return;
    }
    if (matchesKey(data, "return") || data.toLowerCase() === "y") {
      this.onDone(this.selectedButton === 0);
      return;
    }
    if (matchesKey(data, "tab") || matchesKey(data, "left") || matchesKey(data, "right")) {
      this.selectedButton = this.selectedButton === 0 ? 1 : 0;
      this.tui.requestRender();
    }
  }

  render(width: number): string[] {
    // Render message and [Yes] [No] buttons
    // Highlight selected button with theme.fg("accent", ...)
  }
}
```

### Progress/Loading Overlay

```typescript
class LoadingOverlay implements Component, Focusable {
  private message: string;
  private frame = 0;
  private interval: ReturnType<typeof setInterval>;

  constructor(tui: TUI, theme: Theme, message: string) {
    this.message = message;
    // Animate spinner
    this.interval = setInterval(() => {
      this.frame++;
      tui.requestRender();
    }, 100);
  }

  dispose(): void {
    clearInterval(this.interval);
  }

  render(width: number): string[] {
    const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const spinner = spinners[this.frame % spinners.length];
    // Render spinner + message
  }
}
```

## Tips

1. **Always use plain numbers for width** - `width: 60`, not `width: "60%"`

2. **Call `tui.requestRender()`** after any state change that affects the display

3. **Handle cleanup** - If using timers/intervals, clear them in a `dispose()` method

4. **Use `visibleWidth()`** for accurate padding calculations with ANSI codes

5. **Use `truncateToWidth()`** to safely truncate text with ANSI codes

6. **Test with different terminal sizes** - Overlays should handle narrow terminals gracefully

## Reference

- [pi-skill-palette](https://github.com/nicobailon/pi-skill-palette) - Production example
- [overlay-qa-tests.ts](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/overlay-qa-tests.ts) - Comprehensive overlay examples
- [tui.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md) - Full TUI documentation
- [extensions.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) - Extension API documentation
