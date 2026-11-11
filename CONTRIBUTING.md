# Contributing

This repository is a customer-facing Build Guild website, not a reusable facilitator-kit catalog.

## Content changes

Follow [authoring](docs/AUTHORING.md). Add or update a session's `index.md` for its public summary, dates, high-level agenda, optional minutes, and resource links. Keep attendance lists, private meeting credentials, internal discussion, and restricted recordings out of the repository.

Use the **Session proposal** issue form for a future public gathering and the bug form for reproducible website problems. Local schedules and minutes normally belong in the appropriate Guild's template copy, not the shared starter examples.

## Website changes

1. Fork the repository or create a branch if you have write access. Template copies are independent, not automatically forks.
2. Keep changes focused. Normal session updates should require only Markdown and optional public assets, not renderer edits.
3. Run `npm ci`, `npm test`, and `npm run build`.
4. Review the rendered result, dates, optional minutes, and links at both mobile and desktop sizes.
5. Open a pull request describing the intended audience-facing change and actual verification.

Preserve relative links for root and GitHub Pages repository-subpath hosting. CI validates pull requests but never deploys them. New dependencies or publishing behavior need a clear reason.

There is no automatic upstream synchronization. Review and apply shared website updates deliberately, preserving local Guild content.

## Contribution terms

Original code/project documentation is MIT; original public session descriptions, agendas, minutes, and assets are CC BY 4.0. Preserve attribution when adapting existing content and contribute only material you are authorized to license. External links retain their own licenses and access terms; see [licensing](docs/LICENSING.md).

Reusable session kits are maintained separately. This website does not create, migrate, or synchronize a kit repository.
