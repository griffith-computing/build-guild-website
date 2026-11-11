# Configuration and data rules

JSON Schemas in `schemas` support editor hints; `npm run validate` additionally checks references, dates, links, Markdown, and local files. Unknown metadata properties are errors rather than ignored settings.

## Guild configuration

Required `guild.json` fields: `name`, `description`, `intro`, `cadence`, and `timeZone`. Use a real IANA zone such as `America/New_York`, `America/Los_Angeles`, or `Etc/UTC`. Cadence is display text, not a recurrence rule; event timestamps are authoritative.

Optional fields:

| Field | Values |
| --- | --- |
| `example` | Boolean; `true` displays the template-preview banner |
| `accent` | `violet` (default), `teal`, or `blue` |
| `links` | Optional `registration`, `community`, `suggestTopic`, `volunteer`, `contribute` HTTPS URLs |
| `organizers` | Array of `{ "name": "...", "role": "...", "url": "https://..." }`; URL optional |
| `$schema` | Editor-only schema reference |

Leave optional links absent rather than using placeholder URLs. Organizer names are opt-in public information; no headshots or personal details are provided by the starter.

## Session metadata

Each `sessions\<id>` directory contains `session.json` and a nonempty `README.md`. The ID must match its directory and use lowercase letters/digits separated by single hyphens.

Required fields:

| Field | Contract |
| --- | --- |
| `id`, `title`, `summary` | Stable ID and nonblank display text |
| `status` | `idea` or `ready` |
| `type` | `workshop`, `deep-dive`, `showcase`, or `discussion` |
| `level` | `beginner`, `intermediate`, or `advanced` |
| `durationMinutes` | Integer from 5 through 480 |
| `audience`, `tags`, `objectives` | Nonempty arrays of unique nonblank strings |
| `prerequisites` | Array of unique strings; may be empty |
| `resources` | Array of `{ "label": "...", "url": "..." }`; may be empty |

Optional `sources` uses the same label/URL shape for HTTPS provenance/adaptation links. Preserve attribution in the Markdown guide too, so credit travels when the folder is copied.

## Event records

One JSON file per event in `events`, with `id` matching its filename (without `.json`). Delete all records to show the unscheduled empty state; kits do not require events.

```json
{
  "$schema": "../schemas/event.json",
  "id": "context-april",
  "origin": "guild",
  "sessionId": "copilot-context",
  "startsAt": "2027-04-14T13:00:00-04:00",
  "endsAt": "2027-04-14T14:00:00-04:00",
  "links": {
    "registration": "https://example.org/register",
    "notes": "https://example.org/notes"
  }
}
```

Guild events inherit title, summary, type, and tags from their ready kit; do not duplicate those fields. Each occurrence may set `registration`, `recording`, `notes`, `slides`, and `demo` HTTPS links. Links are optional. `example: true` explicitly labels sample events.

External events use `origin: "external"` with `title`, `summary`, `type`, `tags`, and `links.registration` instead of `sessionId`. They are clearly labeled and sorted alongside Guild events. They do not imply endorsement or confer reuse rights.

Use full `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss+/-HH:mm` timestamps, with end after start. Invalid calendar dates fail validation. Choose the correct offset for the actual date, including daylight saving time. The configured time zone changes display, not the timestamp's instant.

## Markdown and assets

Raw HTML in Markdown is displayed as text, not executed. Standard headings, lists, tables, code fences, quotes, and links are supported. Link targets must be absolute HTTPS URLs or kit-local `assets/` paths. Inline images must be kit-local PNG, JPEG, GIF, or WebP assets. Heading-anchor and arbitrary cross-file Markdown links are not supported.

Local paths use forward slashes as URL separators (including on Windows), safe letters/digits/underscores/hyphens, and these extensions: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.pdf`, `.txt`, `.md`, `.json`, `.csv`, `.ipynb`. No traversal, encoded paths, spaces, HTML/SVG, or symbolic links. Files must exist. HTTPS links cannot contain credentials, whitespace, or backslashes.

Only assets directly referenced by guide links/images or metadata resources are published. A referenced Markdown asset is a downloadable document, not another rendered page; do not depend on nested asset links being discovered automatically. Review contributed assets yourself: the builder does not inspect PDFs/notebooks or scan files for secrets.

Published metadata omits the repository-relative `$schema` editor hint so downloaded kits remain portable. Keep the Markdown and metadata together, and download referenced assets too.
