# Software Development Principles

- Keep functions small and focused — each function should do one thing well and fit in ~20-30 lines.
- Fail early, fail loudly — validate inputs at boundaries; throw meaningful errors instead of silently continuing.
- Write pure functions where possible — minimize side effects; make data transformations explicit and testable.
- Handle errors at the right level — catch exceptions where you can meaningfully recover, not everywhere.
- Make state obvious — avoid hidden state and global variables (except for defining constants). Pass data explicitly.
- Write tests for behavior, not implementation — test what code does, not how it does it. Avoid mocking internals.
- Separate concerns — Don't interleave unrelated things together. for example, I/O, business logic, and presentation should live in different layers. Separate based on domain concerns where applicable.
- Make illegal states unrepresentable — use types and data structures that prevent invalid combinations.
- Abstractions should simplify, not hide — Good abstractions draw away complexity. Don't confuse ease of construction with simplicity of result.
- Think before you code — Design is considering multiple options. Understand problems deeply before jumping to solutions.


# Tool Preferences

When using the bash tool for searching files or file contents:
- Use `rg` (ripgrep) instead of `grep`
- Use `fd` instead of `find`
