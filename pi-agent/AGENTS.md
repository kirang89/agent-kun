# Software Development Principles

- Keep functions small and focused — each function should do one thing well.
- Fail early, fail loudly — validate inputs at boundaries; throw meaningful errors instead of silently continuing.
- Write pure functions where possible — minimize side effects; make data transformations explicit and testable.
- Handle errors at the right level — catch exceptions where you can meaningfully recover, not everywhere.
- Make state obvious — avoid hidden state and global variables (except for defining constants). Pass data explicitly.
- Separate concerns — Don't interleave unrelated things together. for example, I/O, business logic, and presentation should live in different layers. Separate based on domain concerns where applicable.
- Make illegal states unrepresentable — use types and data structures that prevent invalid combinations.
- Abstractions should simplify, not hide — Good abstractions draw away complexity. Don't confuse ease of construction with simplicity of result.
- Think before you code — Design is considering multiple options. Understand problems deeply before jumping to solutions.
- Validate a bug by reproducing it first with a test and then fixing it to verify the fix.

# Dependencies

- Always prefer pinning dependencies

# Documentation

- Every new feature addition should update all relevant documentation
- Always explain your reasoning briefly in comments when fixing a bug

# Testing

- Write tests for behavior, not implementation — test what code does, not how it does it. Avoid mocking internals.

# Code Organization

- Organize code neatly following the practices adopted by the language ecosystem (e.g. imports -> constants -> public fns -> private fns)

# Tool Preferences

<!-- - You are operating in an environment where ast-grep is installed. For any code search that requires understanding of syntax or code structure, you should default to using `ast-grep --lang [language] -p '<pattern>'`. Adjust the `--lang` flag as needed for the specific programming language. Avoid using text-only search tools unless a plain-text search is necessary. -->
- When doing a plain-text search for file contents, use `rg` (ripgrep) instead of `grep`
- Use `fd` instead of `find` when searching for files
<!-- - Always prefer doing narrow searches with the available information (e.g. searching within files of a specific extension instead of wildcard equivalent). -->

# Responses

- Respond and report information in an extremely concise way. Sacrifice grammar for the sake of concision.

# Don'ts

- NEVER read, write, or edit `.env`. NEVER echo to check any environment variable that represents an API Key or secret. Just prompt the user to change them and then proceed after the user makes it.
