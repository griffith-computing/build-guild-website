export const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const link = (url, label, className = '') => `<a${className ? ` class="${className}"` : ''} href="${escape(url)}">${escape(label)}</a>`;
const chips = values => values.length ? `<div class="chips">${values.map(value => `<span>${escape(value)}</span>`).join('')}</div>` : '';
const labels = {
  registration: 'Register', community: 'Join the community', suggestTopic: 'Suggest a topic',
  volunteer: 'Volunteer to present', recording: 'Watch recording', slides: 'View slides', demo: 'Explore demo'
};
const actions = links => Object.keys(links ?? {}).length ? `<div class="actions">${Object.entries(links).map(([key, url]) =>
  link(url, labels[key], key === 'registration' ? 'button' : '')).join('')}</div>` : '';
const searchable = session => escape([session.title, session.summary, session.type, session.body.search, ...session.tags].join(' ').toLowerCase());
const attributes = session => `data-card data-type="${escape(session.type)}" data-status="${session.status}" data-tags="${escape(JSON.stringify(session.tags))}" data-search="${searchable(session)}"`;
const sessionUrl = session => `sessions/${session.id}/index.html`;
const agendaPreview = session => session.body.agenda.replace(/\b(href|src)="assets\//g, `$1="sessions/${session.id}/assets/`);

function timeRange(session, guild) {
  const date = value => new Intl.DateTimeFormat('en', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: guild.timeZone
  }).format(new Date(value));
  return `<p class="event-date"><time datetime="${escape(session.startsAt)}">${escape(date(session.startsAt))}</time> &ndash; <time datetime="${escape(session.endsAt)}">${escape(date(session.endsAt))}</time><br><small>${escape(guild.timeZone)}</small></p>`;
}

function collection(id, title, intro, sessions, guild) {
  const select = (name, values) => `<label>${name[0].toUpperCase() + name.slice(1)}
    <select name="${name}"><option value="">All ${name}s</option>${values.map(value =>
      `<option value="${escape(value)}">${escape(value)}</option>`).join('')}</select></label>`;
  const types = [...new Set(sessions.map(session => session.type))].sort();
  const tags = [...new Set(sessions.flatMap(session => session.tags))].sort();
  return `<section id="${id}" class="section" data-collection>
    <div class="section-heading"><div><p class="eyebrow">${id === 'upcoming' ? 'Join the conversation' : 'Our community archive'}</p><h2>${title}</h2></div><p>${intro}</p></div>
    ${sessions.length ? `<form class="filters" hidden role="search" aria-label="Search ${title.toLowerCase()}">
      <label class="search">Search<input name="query" type="search" placeholder="Find a topic"></label>
      ${select('type', types)}${select('tag', tags)}<button type="reset">Reset</button>
    </form><p class="result-count" role="status" aria-live="polite" hidden></p>` : ''}
    <div class="cards">${sessions.map(session => `<article class="card" id="session-${session.id}" ${attributes(session)}>
      <div class="card-meta"><span>${session.example ? 'Example session' : escape(session.type)}</span><span class="badge">${session.status === 'upcoming' ? 'Upcoming' : 'Past'}</span></div>
      <h3>${link(sessionUrl(session), session.title)}</h3><p>${escape(session.summary)}</p>
      ${timeRange(session, guild)}${chips(session.tags)}
      ${id === 'upcoming' ? `<div class="agenda-preview prose"><h4>Agenda</h4>${agendaPreview(session)}</div>` : ''}
      <div class="actions">${link(sessionUrl(session), 'View session')}${id === 'past' && session.body.hasMinutes ? link(`${sessionUrl(session)}#meeting-minutes`, 'Meeting minutes') : ''}</div>
      ${actions(session.links)}
    </article>`).join('')}</div>
    <p class="empty" data-no-results hidden>No matches. Try another search or reset the filters.</p>
    ${sessions.length ? '' : `<p>${id === 'upcoming' ? 'No upcoming sessions are announced yet. Check back for the next gathering.' : 'Past sessions will appear here after they take place.'}</p>`}
  </section>`;
}

export function home({ guild, sessions }) {
  const upcoming = sessions.filter(session => session.status === 'upcoming');
  const past = sessions.filter(session => session.status === 'past');
  const next = upcoming[0];
  return `${guild.example ? '<aside class="notice"><strong>Example Guild.</strong> The sessions below are sample content, not real invitations.</aside>' : ''}
    <section class="hero">
      <div><p class="eyebrow">GitHub Copilot / Build Guild</p><h1>Learn together.<br><span>Build what comes next.</span></h1>
      <p class="lead">${escape(guild.intro)}</p><p class="cadence">${escape(guild.cadence)} &middot; ${escape(guild.timeZone)}</p>
      <div class="actions">${link('#upcoming', 'Explore upcoming sessions', 'button')}${guild.links?.registration ? link(guild.links.registration, 'Join the Guild', 'secondary-button') : link('#past', 'Explore past sessions', 'secondary-button')}</div></div>
      <div class="hero-panel"><p class="eyebrow">${next ? 'Next gathering' : 'A place to learn and share'}</p>
      ${next ? `<h2>${escape(next.title)}</h2>${next.example ? '<p class="muted">Example session</p>' : ''}${timeRange(next, guild)}<p>${escape(next.summary)}</p><p>${link(sessionUrl(next), 'See the agenda')}</p>` : '<h2>Bring your questions.</h2><p>Connect with other builders, explore practical workflows, and share what you learn.</p>'}</div>
    </section>
    ${collection('upcoming', 'Upcoming sessions', 'See what is coming up, explore the agenda, and join us.', upcoming, guild)}
    ${collection('past', 'Past sessions', 'Revisit previous gatherings and find meeting minutes, recordings, and resources when available.', past, guild)}
    <section id="about" class="section about">
      <div><p class="eyebrow">Learn. Share. Build.</p><h2>About ${escape(guild.name)}</h2><p>${escape(guild.description)}</p>${actions(guild.links)}</div>
      <div class="panel"><h3>What to expect</h3><p>A welcoming place to explore GitHub Copilot with fellow builders.</p><ul><li>Practical demonstrations and shared experiences</li><li>Questions, discussion, and new perspectives</li><li>Ideas you can bring back to your own work</li></ul></div>
    </section>
    ${guild.organizers?.length ? `<section class="section"><p class="eyebrow">Your hosts</p><h2>Meet the organizers</h2><div class="cards">${guild.organizers.map(person => `<article class="card"><h3>${person.url ? link(person.url, person.name) : escape(person.name)}</h3><p>${escape(person.role)}</p></article>`).join('')}</div></section>` : ''}`;
}

export function sessionPage(session, guild) {
  return `<div class="session-heading"><p>${link(`../../index.html#${session.status}`, `Back to ${session.status} sessions`)}</p>
    <p class="eyebrow">${session.status === 'upcoming' ? 'Upcoming session' : 'Past session'}</p>
    <h1>${escape(session.title)}</h1><p class="lead">${escape(session.summary)}</p>${timeRange(session, guild)}${chips(session.tags)}${actions(session.links)}</div>
    ${session.example ? '<aside class="notice"><strong>Example session.</strong> This page is sample content, not a real event invitation.</aside>' : ''}
    ${session.body.html ? `<article class="prose session-content">${session.body.html}</article>` : ''}`;
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
