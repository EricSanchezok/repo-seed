# Embed human readability in existing governance

## Status

Accepted
Class: process

## Context and Problem Statement

repo-seed defines risk-driven testing, architecture documentation, semantic review, and resident governance routing, but it does not explicitly guide agents to preserve a readable logic mainline, justify indirection, choose semantically accurate names, or reuse one repository vocabulary. A new comprehensive clean-code skill could cover those topics, but it would compete with the resident router, add instruction weight to ordinary tasks, and risk turning contextual design judgment into universal line, argument, or complexity thresholds. Relying only on the global repo-seed skill would not work because ordinary implementation intentionally does not invoke the lifecycle skill.

## Decision Drivers

- Put the smallest useful standing rule in the context every coding agent reads.
- Evaluate readability from a human reader's path rather than numeric proxies.
- Preserve local language idioms and repository vocabulary instead of inventing conventions.
- Make unjustified abstraction and vocabulary drift visible during semantic review.
- Avoid another resident skill, document tier, capability, or gate without a distinct workflow to own.
- Keep subjective polish advisory while blocking misleading or structurally unsafe code.

## Considered Options

- Embed a compact standing order and review procedure in existing AGENTS, repo-seed analysis, repo-review, and review derivation surfaces.
- Add a dedicated resident code-readability skill and policy document.
- Depend on an externally installed clean-code or architecture skill.
- Enforce readability through line, parameter, duplication, or cognitive-complexity thresholds.

## Decision Outcome

Chosen option: human readability becomes part of the existing baseline instruction and semantic-review loop. Generated AGENTS carries the standing principle, the global skill learns local vocabulary and abstraction conventions during analysis, repo-review performs the entry-point-down assessment and separates blocking semantic failures from advisory polish, and the derivation standard permits project-specific vocabulary checks only when repository evidence supports them. No new capability, resident skill, document, or deterministic gate is introduced.

## Pros and Cons of the Options

Embedding the rule keeps it visible during ordinary work, reuses established routing, and adds little context; its semantic nature means reviewer judgment remains necessary. A dedicated skill can contain more examples and procedures but adds routing competition and ongoing maintenance for a concern that already belongs to implementation and review. An external dependency offers broad material but cannot guarantee availability, local alignment, or stable behavior. Numeric gates are deterministic but mistake convenient proxies for human understanding and encourage mechanical splitting or renaming.

## Links

- [Human-readable implementation guidance Spec](../specs/0003-human-readable-implementation-guidance.md)
- [Google: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
- [Google: The standard of code review](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Go style decisions: naming](https://google.github.io/styleguide/go/decisions.html#naming)
- [Anthropic engineering code-review skill](https://github.com/anthropics/knowledge-work-plugins/blob/main/engineering/skills/code-review/SKILL.md)
- [Agent-oriented clean-code skill surveyed as an alternative](https://github.com/btseee/clean-code-skills/blob/main/skills/clean-code/SKILL.md)
