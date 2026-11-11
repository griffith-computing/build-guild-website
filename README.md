# Build Guild website

A customer-facing website template for GitHub Copilot Build Guilds. Share upcoming sessions and high-level agendas, and keep an archive of past gatherings with optional public meeting minutes, recordings, and resources.

**Markdown is the content backend.** Maintainers edit session files in GitHub; CI validates them and generates a static site for GitHub Pages. No CMS, database, or admin application is required. Reusable facilitator kits belong in a separate repository and are not bundled, imported, or required here.

## Preview locally

Install **Node.js 24 or newer** (Node 24 LTS is used in CI).

```powershell
npm ci
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. Stop the preview with Ctrl+C. Build before previewing; the preview serves `dist` and does not watch source changes. `npm run validate` checks content without writing a site.

## Set up your Guild

1. Enable **Settings > General > Template repository** in the central repository, then use **Use this template > Create a new repository**, or copy it manually.
2. Edit `guild.json` for your Guild's identity, introduction, cadence, IANA time zone, optional community/registration links, and organizers. Set `example` to `false` when ready to launch.
3. Replace the sample directories under `content\sessions` with real public sessions. The starter includes one future example and past examples with and without minutes; none are real invitations.
4. Run the tests/build and review the public site.
5. In your destination repository, enable **Settings > Pages > Source: GitHub Actions**.

The template copies remain independent. GitHub settings and downstream repositories are not created by the builder.

## Publish a session

Copy the Markdown starter:

```powershell
Copy-Item -Recurse docs\session-template content\sessions\your-session
```

Edit `content\sessions\your-session\index.md`. Its YAML front matter supplies the title, summary, start/end timestamps, and optional links/tags. Its `## Agenda` section supplies the high-level agenda shown for an upcoming session. Replace the sample dates and set `example: false`.

After the session, optionally add a nonempty `## Meeting minutes` section to the **same file**. The archive will link to those minutes after the session ends. No separate JSON event record, kit metadata, or layout edit is needed.

See [authoring](docs/AUTHORING.md) and [configuration](docs/CONFIGURATION.md) for a complete example and supported fields.

## CI/CD publishing

Pull requests run `npm test` and `npm run build` without deployment privileges. Pushes to `main` and manual **Deploy GitHub Pages** runs build and upload **only `dist`**. Session Markdown and attachment changes use this same pipeline; there are no path exclusions or scheduled refreshes.

If your default branch differs, update both workflows' branch triggers and the deployment job's `github.ref` guard in `.github\workflows\pages.yml`. Manual deployment runs must target that branch. Deployment requires appropriate repository/Pages permissions and may require approval of the `github-pages` environment.

**Upcoming/past status is evaluated at build time.** Sessions remain upcoming until their end time. Upcoming sessions sort earliest first; past sessions sort newest first. Published grouping changes at the next successful build, not automatically at the instant a meeting ends. Edit the content or run Pages manually to refresh it.

All internal links are relative, supporting owner sites, repository sites such as `https://OWNER.github.io/REPOSITORY/`, and custom domains without base-path changes. Configure custom domains through GitHub Pages settings and your DNS provider.

## Structure

```text
guild.json                          Guild identity, time zone, and public links
content/sessions/<slug>/index.md     One dated session, agenda, optional minutes
content/sessions/<slug>/assets/      Optional public attachments
docs/session-template/index.md      Copyable Markdown starter
schemas/                            Validated metadata contracts
templates/ + assets/                Public page layout, styles, and interactions
scripts/ + tests/                    Builder, preview, and regression tests
dist/                               Generated, ignored, and published by Pages
```

Do not edit `dist`; rebuild it. Invalid content stops the build and leaves the previous successful output intact. Successful builds replace obsolete generated pages and assets.

## Public content and contributions

Only approved public information belongs in session Markdown and attachments. Do not commit credentials, private meeting links, attendee details, or restricted recordings. Source files are not private simply because the generated site does not link to them.

See [contributing](CONTRIBUTING.md) for changes to this website. The former combined kit/event JSON format is no longer supported. Original facilitator kits remain available in Git history; creating or migrating a separate kit repository is a separate task.

## References and licenses

The design was informed by [NYC Build Guild](https://github.com/mullis623/nyc-build-guild), [PennDOT Build Guild](https://github.com/ricardo-msft-SE/PennDOTBuildGuild), and [California Build Guild](https://github.com/jileary23/CAGitHubBuildGuild). Their code, event descriptions, headshots, slides, and recordings were not copied. See [provenance](docs/PROVENANCE.md).

Original code/project documentation: [MIT](LICENSE). Original public session content: [CC BY 4.0](LICENSE-CONTENT.txt). See [licensing](docs/LICENSING.md) for scope; externally linked resources retain their own terms.
