---
name: context7
description: Retrieve up-to-date library documentation from Context7. Use when working with libraries/frameworks (React, Next.js, Vue, Express, etc.) to get current API docs, code examples, and best practices. Prevents hallucinating outdated APIs.
---

# Context7 Documentation Lookup

Fetches up-to-date, version-specific documentation and code examples from [Context7](https://context7.com). Use this when you need accurate, current information about libraries and frameworks.

## Setup

Get a Context7 API key for higher rate limits (optional but recommended):

1. Create an account at https://context7.com
2. Go to Dashboard → API Keys
3. Add to your shell profile (`~/.profile` or `~/.zprofile`):
   ```bash
   export CONTEXT7_API_KEY="your-api-key-here"
   ```

Without an API key, the service works with rate limits.

## Usage

### Search for a Library

Find the library ID first:

```bash
{baseDir}/docs.py search <library-name> [query]
```

### Get Documentation

Fetch documentation for a specific library:

```bash
{baseDir}/docs.py docs <library-id> <query>
```

## Examples

```bash
# Find the React library
{baseDir}/docs.py search react "hooks"

# Get documentation about useEffect
{baseDir}/docs.py docs /facebook/react "useEffect cleanup"

# Search for Next.js
{baseDir}/docs.py search nextjs "app router"

# Get Next.js docs about server components
{baseDir}/docs.py docs /vercel/next.js "server components data fetching"

# Search for a specific version
{baseDir}/docs.py docs /vercel/next.js/v15.1.8 "middleware authentication"
```

## Workflow

1. **Search first**: Use `search` to find the correct library ID
2. **Get docs**: Use `docs` with the library ID and your specific question
3. **Be specific**: More detailed queries return better, more relevant documentation

## When to Use

- Before using a library API you're not 100% certain about
- When writing code with libraries that update frequently (React, Next.js, etc.)
- To get current best practices and code examples
- To verify correct function signatures and parameters
- When the library documentation might have changed since your training data
