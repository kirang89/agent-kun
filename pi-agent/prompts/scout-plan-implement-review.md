---
description: Full workflow — scout gathers context, planner creates plan, worker implements, reviewer reviews
---
Use the subagent tool with the chain parameter to execute this workflow:

1. First, use the "scout" agent to gather context for: $@
2. Then, use the "planner" agent to create an implementation plan using {previous}
3. Then, use the "worker" agent to implement the plan from {previous}
4. Finally, use the "reviewer" agent to review the implementation from {previous}

Execute this as a chain, passing output between steps via {previous}.
