## Purpose

Practice treating generated tests as a hypothesis to verify, not as evidence simply because they pass. This original starter kit uses a deliberately small bug.

## Agenda

| Minutes | Activity |
| --- | --- |
| 0-10 | Reproduce and agree on expected behavior |
| 10-25 | Draft and review a regression test |
| 25-35 | Observe a meaningful failure |
| 35-50 | Make the smallest fix and rerun tests |
| 50-60 | Review edge cases and share findings |

## Facilitator preparation

Use a practice project with an existing runner. Introduce a function that calculates the total of a cart but incorrectly drops items with quantity zero by replacing zero with a default of one. Agree that zero means no charge; this is an exercise rule, not a universal business rule.

Have the existing tests passing before the exercise. Prepare a known failing example so you can help pairs distinguish a setup error from a regression.

## Exercise

Ask Copilot to inspect the code and existing tests before editing:

```text
The cart total treats quantity 0 as quantity 1.
Expected behavior: a zero-quantity item contributes zero to the total.
First propose one regression test using the existing runner.
Do not change the production code yet.
Explain why the test should fail on the current implementation.
```

Review the expected value independently. Run the test and record the actual failure. If it passes unexpectedly, investigate rather than changing the assertion to fit the implementation.

Then request the smallest fix. Preserve current valid inputs and use existing error handling. Run the regression and related tests. Review the diff for unrelated refactoring.

## Expected outcomes

Each pair presents the bug reproduction, the failing assertion, the patch, and the final test result. Include one boundary case such as an empty cart, but avoid writing a large speculative suite.

## Debrief and adaptation

Which assertions tested behavior rather than internal structure? Could a wrong implementation still satisfy the test? Did the generated fix introduce a new assumption about missing or negative quantities?

For another language, keep the same behavior and use its existing runner. For a beginner group, provide the initial test skeleton.

## Follow-up

Apply the test-first review loop to one approved backlog bug. Bring a short description of the assertion that mattered, not private code or data.

## Attribution

Original material by Build Guild template contributors, 2026.
Source: [Build Guild template](https://github.com/griffith-computing/build-guild-website).
Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
When adapting, retain this attribution and add your changes and credit below.
