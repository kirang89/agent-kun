#!/usr/bin/env bun
/**
 * Render Mermaid diagrams using beautiful-mermaid
 * 
 * Usage:
 *   ./render.js <diagram-file> [options]
 *   cat diagram.mmd | ./render.js - [options]
 * 
 * Options:
 *   --output, -o <file>    Output file (default: stdout for ASCII, diagram.svg for SVG)
 *   --format, -f <format>  Output format: svg, ascii, unicode (default: svg)
 *   --theme, -t <theme>    Theme name (default: tokyo-night)
 *   --bg <color>           Background color (hex)
 *   --fg <color>           Foreground color (hex)
 *   --transparent          Use transparent background (SVG only)
 *   --list-themes          List available themes
 * 
 * Examples:
 *   ./render.js diagram.mmd -f ascii
 *   ./render.js diagram.mmd -t dracula -o output.svg
 *   cat diagram.mmd | ./render.js - -f unicode
 */

import { readFileSync, writeFileSync } from 'fs';
import { renderMermaid, renderMermaidAscii, THEMES } from 'beautiful-mermaid';

const args = process.argv.slice(2);

function parseArgs(args) {
  const opts = {
    input: null,
    output: null,
    format: 'svg',
    theme: 'tokyo-night',
    bg: null,
    fg: null,
    transparent: false,
    listThemes: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--output':
      case '-o':
        opts.output = args[++i];
        break;
      case '--format':
      case '-f':
        opts.format = args[++i];
        break;
      case '--theme':
      case '-t':
        opts.theme = args[++i];
        break;
      case '--bg':
        opts.bg = args[++i];
        break;
      case '--fg':
        opts.fg = args[++i];
        break;
      case '--transparent':
        opts.transparent = true;
        break;
      case '--list-themes':
        opts.listThemes = true;
        break;
      default:
        if ((!arg.startsWith('-') || arg === '-') && !opts.input) {
          opts.input = arg;
        }
        break;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(args);

  if (opts.listThemes) {
    console.log('Available themes:');
    for (const [name, colors] of Object.entries(THEMES)) {
      console.log(`  ${name.padEnd(22)} bg: ${colors.bg}  fg: ${colors.fg}`);
    }
    return;
  }

  if (!opts.input) {
    console.error('Usage: render.js <diagram-file|-> [options]');
    console.error('Use --list-themes to see available themes');
    process.exit(1);
  }

  // Read input
  let diagram;
  if (opts.input === '-') {
    diagram = await Bun.stdin.text();
  } else {
    diagram = readFileSync(opts.input, 'utf-8');
  }

  // Build theme options
  const theme = THEMES[opts.theme] || THEMES['tokyo-night'];
  const renderOpts = {
    ...theme,
    ...(opts.bg && { bg: opts.bg }),
    ...(opts.fg && { fg: opts.fg }),
    transparent: opts.transparent,
  };

  let output;
  
  if (opts.format === 'ascii') {
    output = renderMermaidAscii(diagram, { useAscii: true });
  } else if (opts.format === 'unicode') {
    output = renderMermaidAscii(diagram, { useAscii: false });
  } else {
    // SVG
    output = await renderMermaid(diagram, renderOpts);
  }

  // Write output
  if (opts.output) {
    writeFileSync(opts.output, output);
    console.error(`Written to ${opts.output}`);
  } else if (opts.format === 'svg' && opts.input !== '-') {
    // Default SVG output file
    const outFile = opts.input.replace(/\.(mmd|mermaid)$/, '') + '.svg';
    writeFileSync(outFile, output);
    console.error(`Written to ${outFile}`);
  } else {
    console.log(output);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
