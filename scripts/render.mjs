export const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const list = values => `<ul>${values.map(value => `<li>${escape(value)}</li>`).join('')}</ul>`;
const link = (url, label, className = '') => `<a${className ? ` class="${className}"` : ''} href="${escape(url)}">${escape(label)}</a>`;
const chips = values => `<div class="chips">${values.map(value => `<span>${escape(value)}</span>`).join('')}</div>`;
const labels = {
  registration: 'Register', community: 'Join the community', suggestTopic: 'Suggest a topic',
  volunteer: 'Volunteer to present', contribute: 'Contribute a kit', recording: 'Watch recording',
  notes: 'Read notes', slides: 'View slides', demo: 'Explore demo'
};
const actions = links => `<div class="actions">${Object.entries(links ?? {}).map(([key, url]) =>
  link(url, labels[key], key === 'registration' ? 'button' : '')).join('')}</div>`;
const searchable = item => escape([item.title, item.summary, item.type, item.status, ...(item.tags ?? []),
  ...(item.audience ?? []), ...(item.objectives ?? [])].join(' ').toLowerCase());
const attributes = item => `data-card data-type="${escape(item.type)}" data-status="${escape(item.status)}" data-tags="${escape(JSON.stringify(item.tags))}" data-search="${searchable(item)}"`;

function collection(id, title, intro, items, renderCard, statuses) {
  const types = [...new Set(items.map(item => item.type))].sort();
  const tags = [...new Set(items.flatMap(item => item.tags))].sort();
  const select = (name, values) => `<label>${name[0].toUpperCase() + name.slice(1)}
    <select name="${name}"><option value="">All ${name === 'status' ? 'statuses' : `${name}s`}</option>${values.map(value =>
      `<option value="${escape(value)}">${escape(value)}</option>`).join('')}</select></label>`;
  return `<section id="${id}" class="section" data-collection>
    <div class="section-heading"><div><p class="eyebrow">${id === 'catalog' ? 'Take it. Adapt it. Share it.' : 'Meet, learn, repeat'}</p><h2>${title}</h2></div><p>${intro}</p></div>
    <form class="filters" hidden role="search" aria-label="Search ${title.toLowerCase()}">
      <label class="search">Search<input name="query" type="search" placeholder="Find a topic or skill"></label>
      ${select('type', types)}${select('status', statuses)}${select('tag', tags)}
      <button type="reset">Reset</button>
    </form>
    <p class="result-count" role="status" aria-live="polite" hidden></p>
    <div class="cards">${items.map(renderCard).join('')}</div>
    <p class="empty" data-no-results hidden>No matches. Try another search or reset the filters.</p>
    ${items.length ? '' : '<p>No events scheduled yet. Explore a kit below and plan your first gathering.</p>'}
  </section>`;
}

export function home({ guild, sessions, events, now }) {
  const date = value => new Intl.DateTimeFormat('en', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: guild.timeZone
  }).format(new Date(value));
  const eventCard = event => `<article class="card" id="event-${event.id}" ${attributes(event)}>
    <div class="card-meta"><span>${event.example ? 'Example only / ' : ''}${escape(event.origin)} event</span><span class="badge">${event.status}</span></div>
    <h3>${escape(event.title)}</h3><p>${escape(event.summary)}</p>
    <p class="event-date"><time datetime="${escape(event.startsAt)}">${escape(date(event.startsAt))}</time> &ndash; <time datetime="${escape(event.endsAt)}">${escape(date(event.endsAt))}</time><br><small>${escape(guild.timeZone)}</small></p>
    ${chips([event.type, ...event.tags])}
    ${event.sessionId ? `<p>${link(`sessions/${event.sessionId}/index.html`, 'Open session kit')}</p>` : ''}
    ${actions(event.links)}
  </article>`;
  const kitCard = session => `<article class="card" ${attributes(session)}>
    <div class="card-meta"><span>${escape(session.type)} / ${session.durationMinutes} min</span><span class="badge">${session.status}</span></div>
    <h3>${link(`sessions/${session.id}/index.html`, session.title)}</h3>
    <p>${escape(session.summary)}</p><p class="muted">${escape(session.level)} &middot; ${escape(session.audience.join(', '))}</p>
    ${chips(session.tags)}<p class="card-bottom">${link(`sessions/${session.id}/index.html`, session.status === 'idea' ? 'Develop this idea' : 'Explore the kit')}</p>
  </article>`;
  return `${guild.example ? '<aside class="notice"><strong>Template preview.</strong> This is a sample Guild, not an active event series. Replace the configuration and remove example events before publishing your Guild.</aside>' : ''}
    <section class="hero">
      <div><p class="eyebrow">GitHub Copilot / Build Guild</p><h1>Small experiments.<br><span>Shared progress.</span></h1>
      <p class="lead">${escape(guild.intro)}</p><p class="cadence">${escape(guild.cadence)} &middot; ${escape(guild.timeZone)}</p>
      <div class="actions">${link('#catalog', 'Find your next session', 'button')}${guild.links?.registration ? link(guild.links.registration, 'Join a session', 'secondary-button') : link('#about', 'Make it your own', 'secondary-button')}</div></div>
      <div class="hero-panel"><span class="eyebrow">The Build Guild loop</span><ol><li><b>01</b><span>Find a spark<small>Choose an idea or a ready-to-run kit.</small></span></li><li><b>02</b><span>Build together<small>Make room for questions and experiments.</small></span></li><li><b>03</b><span>Pass it on<small>Share your changes with the next Guild.</small></span></li></ol><p>${sessions.filter(item => item.status === 'ready').length} ready-to-adapt &middot; ${sessions.filter(item => item.status === 'idea').length} in development</p></div>
    </section>
    ${collection('events', 'Guild events', `Upcoming first, then past sessions with notes and recordings. Status is evaluated at build time (${now.toISOString().slice(0, 10)}); rebuild to refresh.`, events, eventCard, ['upcoming', 'past'])}
    ${collection('catalog', 'Reusable session kits', 'Start with a ready kit or help turn an idea into a session. Every kit can travel to another Guild.', sessions, kitCard, ['ready', 'idea'])}
    <section id="about" class="section about">
      <div><p class="eyebrow">Local community. Shared starting point.</p><h2>A Guild that feels like yours.</h2><p>${escape(guild.description)}</p><p>Session kits are reusable learning plans, not fixed presentations. Adapt the exercises to your team's tools, experience, and constraints, and share what you learn.</p>${actions(guild.links)}</div>
      <div class="panel"><h3>How to reuse a kit</h3><ol><li>Download its metadata and Markdown guide.</li><li>Keep the attribution; tailor the exercises.</li><li>Schedule a session in your Guild's repository.</li><li>Contribute useful changes back by pull request.</li></ol><p>Template copies are independent. There is no automatic upstream synchronization.</p></div>
    </section>
    ${guild.organizers?.length ? `<section class="section"><p class="eyebrow">Your hosts</p><h2>Meet the organizers</h2><div class="cards">${guild.organizers.map(person => `<article class="card"><h3>${person.url ? link(person.url, person.name) : escape(person.name)}</h3><p>${escape(person.role)}</p></article>`).join('')}</div></section>` : ''}`;
}

export function kit(session) {
  return `<div class="kit-heading"><p>${link('../../index.html#catalog', 'Back to all session kits')}</p><p class="eyebrow">${escape(session.type)} / ${escape(session.level)} / ${session.durationMinutes} minutes</p><h1>${escape(session.title)}</h1><p class="lead">${escape(session.summary)}</p>${chips([session.status, ...session.tags])}</div>
    ${session.status === 'idea' ? '<aside class="notice"><strong>Idea, not a ready-to-run session.</strong> Use this outline to develop and try a complete facilitator kit before scheduling it.</aside>' : ''}
    <div class="kit-layout"><aside class="panel kit-sidebar"><h2>At a glance</h2><h3>Who it is for</h3>${list(session.audience)}<h3>Before you begin</h3>${session.prerequisites.length ? list(session.prerequisites) : '<p>No prerequisites.</p>'}<h3>Learning objectives</h3>${list(session.objectives)}
    <h3>Take this kit</h3><p>${link('README.md', 'Download Markdown guide')}</p><p>${link('session.json', 'Download metadata')}</p><p>Keep this folder together with any linked assets.</p>
    <h3>Reuse and attribution</h3><p>Original material: ${link('../../licenses/LICENSE-CONTENT.txt', 'CC BY 4.0')}. Credit the author/source in the guide, link the license, and describe your changes.</p>
    ${session.resources.length ? `<h3>Resources</h3><ul>${session.resources.map(resource => `<li>${link(resource.url, resource.label)}</li>`).join('')}</ul>` : ''}
    ${session.sources?.length ? `<h3>Sources and adaptations</h3><ul>${session.sources.map(source => `<li>${link(source.url, source.label)}</li>`).join('')}</ul>` : ''}</aside>
    <article class="prose">${session.body.html}</article></div>`;
}

export function page(template, { guild }, body, title, root = '') {
  const slots = {
    name: escape(guild.name), title: escape(title), description: escape(guild.description),
    accent: escape(guild.accent ?? 'violet'), root, body
  };
  // Replace only source-template slots; literal braces in authored content are data.
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in slots)) throw new Error(`Unknown page template slot: ${key}`);
    return slots[key];
  });
}
