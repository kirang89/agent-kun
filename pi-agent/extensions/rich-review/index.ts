import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Rich Review Extension
 *
 * Code review based on Rich Hickey's software design philosophy.
 * Evaluates code against principles from his famous talks:
 * - Simple Made Easy
 * - Hammock Driven Development
 * - The Value of Values
 * - Design in Practice
 * - Spec-ulation
 * - Effective Programs
 */

const RICH_HICKEY_PRINCIPLES = `
## Rich Hickey's Software Design Philosophy

You are reviewing code through the lens of Rich Hickey's philosophy. Apply these principles:

### 1. Simple vs Easy
- **Simple** = one fold, unbraid, not interleaved (OBJECTIVE)
- **Easy** = near at hand, familiar (SUBJECTIVE)
- Complexity is the enemy of reliability
- Choose simple constructs even when they're harder to use initially
- Ask: "Is this simple, or just easy/familiar?"

### 2. Complecting (The Root of All Evil)
Watch for things being braided/interleaved together that shouldn't be:
- **State complects value and time** - Can you tell what value something had at a point in time?
- **Objects complect state, identity, and behavior** - Are these separate concerns mixed?
- **Inheritance complects types** - Is there unnecessary type coupling?
- **Methods complect function and state** - Could this be a pure function instead?
- **Variables complect value and time** - Is mutation hiding temporal complexity?
- **Conditionals scattered through code** - Is branching logic distributed when it should be centralized?
- **ORM complects representation** - Is data representation tangled with storage?

### 3. Constructs vs Artifacts
- Focus on the **artifacts produced**, not how convenient it was to author
- Some constructs are easy to write but produce complex artifacts
- Ask: "What does this code create/produce, and is THAT simple?"

### 4. Values over State/Place
- Prefer **immutable values** over mutable state
- State is NEVER simple - it fundamentally complects value and time
- Values are timeless facts; state is "the new memory leak"
- **Place-oriented programming** (mutation in place) causes problems:
  - Requires coordination
  - Breaks concurrent access
  - Makes testing harder
  - Loses history

### 5. Data-Oriented Design (Apply only if relevant)
- **Separate code from data**
- Use plain, generic data structures (maps, vectors, sets) over custom classes
- Data should be self-describing
- Information is simple - don't complect it with implementation
- Custom types should be rare, not the default
- Ask: "Could this be a map/record instead of a class?"

### 6. Composition over Inheritance
- Prefer composing simple, independent parts
- Avoid deep class hierarchies
- Pure functions that take and return data compose naturally
- Inheritance creates implicit coupling and complects types

### 7. Decoupling
- Decouple decisions from one another
- **Use queues** to decouple processes (not direct calls)
- Separate "what" from "how" from "when" from "where"
- Protocols/interfaces for polymorphism, not inheritance
- Ask: "If I change X, how many other things must change?"

### 8. Breaking Changes & Accretion
- **Never break existing consumers**
- Grow by accretion (adding), not by changing or removing
- "Require less, provide more"
- Adding optional parameters is safe; adding required ones breaks
- Removing anything is breaking
- Ask: "Would this change break existing callers?"

### 9. Design Process (Hammock-Driven Development)
- **Think before you code** - design is about considering multiple options
- Problems should be well-understood before solutions are attempted
- Use your subconscious (step away, sleep on it)
- Design documents and diagrams are thinking tools
- Ask: "Was this designed, or just typed?"

### 10. Abstractions
- Abstractions should **draw away** complexity, not hide it
- Create abstractions with simplicity as their basis
- Don't confuse ease of construction with simplicity of artifact
- Generic > Specific (until you need specific)

---

## Complexity Generators to Flag:
- Mutable state and variables
- Objects mixing data + behavior
- Deep inheritance hierarchies
- Methods (function + state coupling)
- Scattered conditionals (switch/if chains)
- Loops when recursion/HOFs would be clearer
- Actors (complect what/who)
- ORMs and tight DB coupling
- Temporal coupling (order dependencies)
- Global state

## Simple Alternatives to Suggest:
- Immutable values instead of mutable state
- Pure functions instead of methods
- Data (maps, records) instead of objects
- Polymorphism via protocols/interfaces
- Queues for decoupling processes
- Declarative data transformation pipelines

---

## Review Output Format

Structure your review as:

### Summary
Brief overall assessment through Hickey's lens.

### Complexity Analysis
- What is being complected?
- What state exists and is it necessary?
- Are constructs simple or just easy?

### Specific Issues
List concrete issues with:
- The principle being violated
- The specific code/pattern
- Why it adds complexity
- A simpler alternative

### What's Good
Acknowledge patterns that align with these principles.

### Recommendations
Prioritized list of changes, from most impactful simplification to least.

Remember: The goal is not to criticize but to help create software that is genuinely simpler to understand, change, test, and maintain over time.
`;

export default function (pi: ExtensionAPI) {
  // Register the /rich-review command
  pi.registerCommand("rich-review", {
    description: "Review code using Rich Hickey's software design philosophy",
    handler: async (args, ctx) => {
      const files = args?.trim();

      if (!files) {
        ctx.ui.notify(
          "Usage: /rich-review <file(s) or description>\nExample: /rich-review src/main.ts\nExample: /rich-review the recent changes",
          "info",
        );
        return;
      }

      // Send the review request as a user message
      pi.sendUserMessage(
        `Please review the following using Rich Hickey's software design philosophy:\n\n${files}\n\n${RICH_HICKEY_PRINCIPLES}`,
      );
    },
  });

  // Also register a tool the LLM can use
  pi.registerTool({
    name: "rich_review_principles",
    label: "Rich Hickey Review Principles",
    description:
      "Get Rich Hickey's software design principles for code review. Use this when asked to do a 'Rich review' or review code through Rich Hickey's philosophy.",
    parameters: {},
    async execute() {
      return {
        content: [
          {
            type: "text",
            text: RICH_HICKEY_PRINCIPLES,
          },
        ],
        details: {},
      };
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.hasUI) {
      ctx.ui.notify(
        "Rich Review extension loaded. Use /rich-review <files>",
        "info",
      );
    }
  });
}
