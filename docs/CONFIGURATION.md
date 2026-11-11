# Configuration and content contract

`npm run validate` checks Guild configuration, YAML front matter, Markdown sections, dates, links, and referenced assets. Invalid content fails with its file/field rather than silently disappearing.

## Guild-wide settings

`guild.json` contains required `name`, `description`, `intro`, `cadence`, and `timeZone` fields. Use an IANA zone such as `America/New_York`, `America/Los_Angeles`, or `Etc/UTC`. Cadence is display text, not a recurrence rule.

Optional settings:

| Field | Values |
| --- | --- |
| `example` | Boolean; displays a sample-Guild notice when true |
| `accent` | `violet` (default), `teal`, or `blue` |
| `links` | Optional `registration`, `community`, `suggestTopic`, `volunteer` HTTPS URLs |
| `organizers` | Array of `{ "name": "...", "role": "...", "url": "https://..." }`; URL optional |
| `$schema` | Editor-only reference to the Guild JSON Schema |

Omitted options do not render. Do not put placeholder links or unapproved personal information into a live Guild configuration.

## Session Markdown

Each `content\sessions\<slug>` directory contains `index.md` and optional `assets`. The slug must use lowercase letters/digits separated by single hyphens. No sessions is also valid.

Start `index.md` with YAML between two `---` lines. Use these front-matter fields:

| Field | Contract |
| --- | --- |
| `title`, `summary` | Required nonblank public text |
| `startsAt`, `endsAt` | Required full timestamps with seconds and explicit UTC offsets; end after start |
| `type` | Optional `session`, `workshop`, `deep-dive`, `showcase`, or `discussion`; omitted means `session` |
| `tags` | Optional array of unique nonblank strings |
| `example` | Optional boolean labeling sample sessions |
| `links` | Optional `registration`, `recording`, `slides`, `demo` HTTPS URLs |

Quote timestamps: `"2027-04-14T13:00:00-04:00"` or `"2027-04-14T17:00:00Z"`. Choose the actual date's offset, including daylight saving time. The Guild time zone controls display, not the timestamp's instant.

Unknown fields, duplicate YAML keys, custom tags, aliases, malformed front matter, invalid calendar dates, and manually authored status fields are rejected. There are no separate session JSON, event JSON, or kit references.

## Markdown sections

Use top-level `## Agenda` for the upcoming session's nonempty high-level agenda. Historical sessions do not require one.

Use optional `## Meeting minutes` for public notes. Empty minutes headings do not render or create a minutes link. Include each reserved section at most once. Section names are case-insensitive; a section ends at the next top-level level-one or level-two heading. Headings inside code blocks or block quotes do not act as reserved sections.

Other Markdown sections are rendered on the detail page. All content is public; committing minutes before a meeting ends also publishes them. Search includes public title, summary, type, tags, and Markdown text.

Raw HTML is shown as text, not executed. Headings, lists, tables, code fences, quotes, and links are supported. Link targets must be absolute HTTPS URLs or session-local `assets/` paths. Inline images must be local PNG, JPEG, GIF, or WebP files. Authored heading-anchor and cross-session links are not supported; the builder generates its own minutes anchor.

## Assets and publishing

Paths use forward slashes as URL separators, including on Windows, with safe letters/digits/underscores/hyphens and one of these extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.pdf`, `.txt`, `.md`, `.json`, `.csv`, `.ipynb`. No traversal, encoded paths, spaces, HTML/SVG, or symbolic links. Files must exist. HTTPS links cannot contain credentials, whitespace, or backslashes.

Only directly referenced assets are copied. Linked Markdown assets are downloads, not recursively rendered pages. Review contributed assets yourself; the builder does not scan PDF/notebook contents for secrets.

Only generated HTML, shared assets, referenced public attachments, and license files are published. Raw session source/front matter is not automatically copied into `dist`. Do not rely on that exclusion to protect sensitive repository content.

Upcoming sessions sort earliest first and past sessions newest first. A session remains upcoming until its end time. Classification uses one build-time clock and remains unchanged until the next successful content/code build or manual deployment; no scheduled refresh or browser-only reclassification is added.
