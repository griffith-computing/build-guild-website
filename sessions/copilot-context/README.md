## Purpose

Explore how task boundaries, repository context, and observable acceptance criteria change an AI-assisted development conversation. This is an original starter exercise, not a record of a delivered Guild event.

## Agenda

| Minutes | Activity |
| --- | --- |
| 0-5 | Introductions and the task |
| 5-15 | Baseline prompt and observation |
| 15-35 | Context-rich prompt in pairs |
| 35-50 | Compare evidence and refine |
| 50-60 | Share one reusable instruction |

## Facilitator preparation

Choose a small practice repository participants are permitted to share with their approved tools. Identify one tiny behavior change, a test command, and two relevant files. Run the tests beforehand. Do not use production data, credentials, or customer code.

Prepare a baseline branch or clean copy so pairs can try both prompts against the same starting point. Allow participants without tool access to pair with a driver.

## Exercise: compare two requests

Begin with a deliberately under-specified request:

```text
Improve the input validation in this project.
```

Before accepting any changes, record what the assistant assumes. Which assumptions can be checked in the repository? Do not merge this first attempt.

Reset to the same starting point using your normal safe workflow, then adapt this prompt:

```text
Inspect the existing input validation and its tests first.
Change only the blank-name behavior: reject names containing only whitespace.
Preserve current handling of valid names and existing error conventions.
Follow the validation helper used by this project.
Add a focused regression case and run the project's documented test command.
Explain any uncertainty before changing unrelated behavior.
```

Use the [worksheet](assets/prompt-worksheet.md) to compare assumptions, changed files, and observed test results. A passing test run is evidence, not proof that all behavior is correct; review the diff as well.

## Expected outcomes

Each pair produces a scoped prompt, a small reviewed diff, and an explanation of what additional context changed. It is also a valid outcome to reject both patches and explain why.

## Debrief and adaptation

Ask: What context helped? What was noise? Which claim still needed human verification?

For beginners, supply the relevant files and test command. For experienced teams, ask pairs to discover the repository conventions themselves. Keep the task small rather than adding a second feature.

## Follow-up

Draft one short, repository-appropriate instruction based on evidence from the exercise. Review it with the team before adopting it. Bring an anonymized observation to the next Guild.

## Attribution

Original material by Build Guild template contributors, 2026.
Source: [Build Guild template](https://github.com/griffith-computing/build-guild-website).
Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
When adapting, retain this attribution and add your changes and credit below.
