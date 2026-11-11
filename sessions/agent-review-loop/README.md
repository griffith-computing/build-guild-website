## Idea

Develop a session around delegating a small, reversible change to a coding agent while keeping a human review loop. This is an original proposal, not a tested facilitator kit. Do not schedule it until it has been expanded and tried.

## Proposed agenda

- 5 minutes: choose a task with observable acceptance criteria.
- 10 minutes: write the allowed scope and explicit exclusions.
- 15 minutes: walk through a hypothetical agent plan and approval checkpoints.
- 10 minutes: review the evidence needed to accept a result.
- 5 minutes: identify missing material for a hands-on version.

## Facilitator preparation still needed

Choose an approved agent environment, create a non-sensitive sample repository, and prepare both a good and an over-scoped task brief. Define exactly which commands and external actions participants may approve. No production deployments or automatic merging.

## Proposed exercise and prompt

```text
Inspect this practice repository and propose a plan for one small change.
List the files you expect to edit, what you will not change,
and which tests would demonstrate the requested behavior.
Do not publish, merge, deploy, or contact external services.
Stop for review if the change requires broader permissions or scope.
```

Have pairs mark the task's boundaries and compare the agent's claimed evidence with actual observations.

## Expected outcomes

A task brief, a review checklist, and an explicit list of unresolved questions. The first pilot should determine whether the exercise fits 45 minutes.

## Follow-up to make this ready

Add runnable setup instructions, a reproducible task, facilitator fallback steps, and observed pilot feedback. Revise the timing and change the metadata status to `ready` only after review.

## Attribution

Original material by Build Guild template contributors, 2026.
Source: [Build Guild template](https://github.com/griffith-computing/build-guild-website).
Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
When adapting, retain this attribution and add your changes and credit below.
