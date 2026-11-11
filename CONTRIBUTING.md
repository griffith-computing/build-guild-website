# Contributing

Contribute an idea, a reusable kit, an improvement to an existing kit, or a focused website fix. Avoid organization-specific links and private data in shared starter content.

## Propose before building

Use the **Session idea** issue form to describe the audience, learning outcome, format, prerequisites, and potential exercises. Ideas are welcome without a speaker or date. Use the bug form for reproducible failures.

## Submit a kit

1. Fork the central repository and create a branch, or use a branch if you have write access. A template copy is independent, not automatically a fork; fork the central repository separately when contributing back.
2. Follow [authoring](docs/AUTHORING.md). Reuse existing kit IDs for improvements, or create a new kebab-case ID for a distinct session.
3. Include facilitator preparation, timing, concrete exercises/prompts, expected outcomes, adaptations, and follow-up. Use `idea` for incomplete proposals. A `ready` kit should be complete enough for another facilitator to review and try.
4. Preserve attribution and record meaningful adaptations. Link third-party resources instead of uploading materials without permission.
5. Run `npm ci`, `npm test`, and `npm run build`. Review the generated page and downloadable guide.
6. Open a pull request explaining the learning goal and the changes. Include pilot observations if available; do not claim a session was piloted if it was not.

Reviewers check portability, accuracy, usable setup, safe practice data, reasonable scope, attribution, and rendered behavior. Shared kits must not require private meeting links or undisclosed paid access.

## Improve the framework

Keep changes small. Ordinary content updates should not require layout edits. Add focused regression cases for changed behavior, and keep both root and repository-subpath hosting functional. CI never deploys a pull request.

## Bring improvements into a template copy

There is no automatic upstream sync. Review central changes, copy or cherry-pick only the pieces you need, resolve differences with your Guild's local content, and run tests/build before publishing. Retain the kit's stable ID and attribution when it is still the same learning plan; use a new ID and a `sources` reference for a substantially different derivative.

## Contribution terms

By submitting original material, you agree to license code/project documentation under MIT and session content under CC BY 4.0 as described in [licensing](docs/LICENSING.md). You must have the right to contribute it. Third-party links do not transfer their content's license. Do not add attendee personal information, secrets, or restricted organizational content.
