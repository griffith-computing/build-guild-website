# Build Guild: a shared starting point

A reusable website template and central catalog of GitHub Copilot Build Guild session kits. Run a local community without maintaining a custom website, and share learning plans other Guilds can adapt.

**Two things, one repository:** a configurable static site for your Guild, and portable JSON + Markdown kits you can use with or without the site. No database, backend, tracking, remote fonts, or automatic upstream synchronization.

## Try it locally

Install **Node.js 24 or newer** (Node 24 LTS is used in CI).

```powershell
npm ci
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. Stop the preview with Ctrl+C. Build before previewing; the preview serves `dist` and does not watch source changes. `npm run validate` checks content without writing a site.

The starter is intentionally neutral: **Your Build Guild**, two original ready-to-adapt kits, one idea, and two explicitly labeled sample events. These are not real invitations or sessions delivered by the reference Guilds.

## Start your own Guild

1. The central repository maintainer enables **Settings > General > Template repository** once. Then select **Use this template > Create a new repository**. You can also copy the repository manually.
2. Edit `guild.json`: name, introduction, description, meeting cadence, and IANA time zone. Set `example` to `false` when ready. Add only the registration/community/organizer links you actually use; omitted options do not render.
3. Replace or delete `events\example-*.json`. Add your own event records referencing ready kits. Keep any useful kits, adapt them, or copy `docs\session-template` to create a new one.
4. Update the contribution and topic-proposal links in `guild.json` to your own repository or intentionally keep them pointing to the central catalog.
5. Run the commands above, review the rendered site, and publish using the instructions below.

Only public information belongs in this repository. Do not commit access tokens, private meeting credentials, attendee details, or restricted recordings.

## Use or contribute a session

Each `sessions\<id>` folder is a portable kit containing `session.json`, a facilitator `README.md`, and any referenced `assets`. Keep the folder together when copying it. The generated kit page also provides downloadable metadata and Markdown.

| Content | Meaning |
| --- | --- |
| Ready kit | A complete starting guide to review and adapt before facilitating |
| Idea | A proposal needing development; cannot be scheduled until promoted to ready |
| Guild event | A dated occurrence of a ready kit, with optional notes/recording links |
| External event | A separately labeled event with its own title, description, and registration link |

See [authoring](docs/AUTHORING.md), [configuration and data rules](docs/CONFIGURATION.md), and [contributing](CONTRIBUTING.md). Template copies are independent: improvements return through pull requests, not a live synchronization service.

## Publish with GitHub Pages

In the destination repository, enable **Settings > Pages > Source: GitHub Actions**. The Pages workflow builds on pushes to `main` and on manual dispatch. If your default branch differs, update both workflows' branch triggers and the deployment job's `github.ref` guard in `.github\workflows\pages.yml`. Manual deployment runs must target that branch.

Pull requests run tests and a build without deployment privileges. Publishing uploads **only `dist`**, not the repository root. Deployment requires appropriate repository/Pages permissions and may require approval of the `github-pages` environment.

All internal links are relative, so the same output works at an owner site, a repository site such as `https://OWNER.github.io/REPOSITORY/`, or a custom domain. No base-path editing is required. Add a custom domain through GitHub Pages settings; DNS and GitHub settings are not managed by the builder.

Event status is evaluated at build time using the event's end timestamp: in-progress events remain upcoming until they end. Upcoming events sort earliest first; past events sort newest first. Rebuild or manually run Pages to refresh status after an event. There is no scheduled feed or deployment job.

## Layout

```text
guild.json                 Guild identity and optional participation links
sessions/<id>/             Portable metadata, Markdown guide, optional assets
events/*.json              Dated occurrences referencing kit IDs
schemas/                   Validated content contracts
templates/ + assets/       Shared site layout, styles, and browser behavior
scripts/ + tests/          Builder, preview, and focused regression tests
docs/session-template/     Copyable new-kit starter
dist/                      Generated, ignored, and published by Pages
```

Do not edit `dist`; rebuild it. Invalid content stops the build and leaves the previous successful output intact. Website customization belongs in `templates` and `assets`, while normal Guild/session updates should need only JSON and Markdown.

## References and licenses

Design patterns were studied in [NYC Build Guild](https://github.com/mullis623/nyc-build-guild), [PennDOT Build Guild](https://github.com/ricardo-msft-SE/PennDOTBuildGuild), and [California Build Guild](https://github.com/jileary23/CAGitHubBuildGuild). Their code, event descriptions, headshots, slides, and recordings were **not copied**. See [provenance](docs/PROVENANCE.md).

Original code and project documentation: [MIT](LICENSE). Original session material: [CC BY 4.0](LICENSE-CONTENT.txt). See the [license scope and attribution guide](docs/LICENSING.md); third-party resources keep their own terms.