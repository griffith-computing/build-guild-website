# Authoring and adapting sessions

## Create an idea or kit

From the repository root in PowerShell:

```powershell
Copy-Item -Recurse docs\session-template sessions\your-session
```

Choose a unique kebab-case folder name and set the same `id` in `session.json`. The copied `$schema` works at the destination. Edit the title, summary, audience, duration, level, format, objectives, and tags. Replace the guide's scaffolding with your own material.

Use `status: "idea"` while developing an outline. No date or presenter is required. To make it ready, complete the setup, agenda, exercises, verification, debrief, and follow-up so someone else can facilitate it. Review or pilot it when possible and record what was actually tried. A ready label is not a guarantee of official training or product support.

## Adapt an existing kit

Copy the whole kit folder, including its `assets`. Preserve the original attribution, source URL, and license, and add an adaptation note describing your changes. Add a `sources` entry pointing to the source repository/page. For a substantially different learning plan, choose a new ID rather than overwriting the old one.

Adapt to your audience's approved tools and access. Keep sample data non-sensitive. Prefer a small working task with observable outcomes over a large demo that depends on one facilitator's environment.

## Schedule it

Add a record under `events` referencing the ready kit ID; see [configuration](CONFIGURATION.md). Use actual timestamps with explicit UTC offsets, not a made-up future date for an idea. Delete starter example records before publishing your real Guild.

After meeting, add public notes, recording, slides, or demo links to that occurrence. Multiple events can reference the same kit without duplicating its material. Do not upload meeting credentials or restricted recordings.

## Check and share

```powershell
npm run validate
npm test
npm run build
npm run preview
```

Open the kit page, follow each local resource link, and read the downloadable Markdown. Confirm the duration matches the agenda and that prerequisites are actionable. Site search matches title, summary, audience, objectives, type, status, and tags; it does not search the full guide.

Submit reusable improvements through the central repository's contribution workflow. Local scheduling and organization-specific notes usually belong only in your Guild copy.
