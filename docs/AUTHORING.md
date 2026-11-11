# Publishing session content

## Create a session

From the repository root in PowerShell:

```powershell
Copy-Item -Recurse docs\session-template content\sessions\your-session
```

Choose a unique kebab-case directory name. It becomes the public URL `sessions/your-session/index.html`; a repeated topic on another date should have a different directory.

Edit only `index.md` to set the title, short public summary, start/end times with explicit UTC offsets, optional tags/type/links, and high-level agenda. Set `example: false` for an actual session.

```markdown
---
title: "Practical workflows with GitHub Copilot"
summary: "Explore everyday workflows and share your questions."
startsAt: "2027-04-14T13:00:00-04:00"
endsAt: "2027-04-14T14:00:00-04:00"
tags:
  - copilot
links:
  registration: "https://example.org/register"
---

## Agenda

- Community updates
- Workflow demonstration
- Questions and discussion
```

Replace example dates and URLs with confirmed public information. Agenda content appears directly in upcoming session cards as well as on the detail page. Keep it high-level and attendee-focused, not a facilitator script.

## Add optional minutes

After the session, add this section to the same Markdown file:

```markdown
## Meeting minutes

- Topics covered and public takeaways
- Agreed next steps
```

A past session gets a **Meeting minutes** link only when that section has content. Omit the heading when no minutes are available; an empty heading is also suppressed. Historical sessions can exist with only a title, summary, and dates.

Add recording/slides/demo HTTPS links to front matter, or place public resources in normal Markdown sections. Relative assets live in the session's `assets` directory and use paths such as `assets/recap.pdf`.

All authored sections are public, including minutes committed before a session ends. There is no embargo, authentication, or private draft store. Review minutes and attachments for approval before committing.

## Validate and publish

```powershell
npm run validate
npm test
npm run build
npm run preview
```

Check the listing and session detail page, date/time zone, agenda, optional minutes, and resource links. Commit the Markdown and any referenced assets together. A pull request validates the content; merging into the deployment branch publishes the generated site.

Grouping uses the build clock. Adding minutes or another content edit will trigger a rebuild; you can also manually dispatch Pages after a meeting. There is no scheduled rebuild.

## Reusable kits

Facilitator exercises, prompts, and reusable kits belong in a separate repository, not this website. Public sessions can use ordinary HTTPS resource links when appropriate, but this site never fetches a kit repository during build or at runtime.
