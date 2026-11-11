import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, cp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { loadContent, timestamp } from '../scripts/content.mjs';
import { build } from '../scripts/build.mjs';
import { matches } from '../assets/filters.js';

const now = new Date('2026-11-11T18:00:00Z');
const repository = fileURLToPath(new URL('../', import.meta.url));
const guild = {
  name: 'Test Guild', description: 'Public learning community', intro: 'Try a small idea.',
  cadence: 'Monthly', timeZone: 'America/New_York'
};
const metadata = {
  title: 'A public session', summary: 'Explore a practical Copilot workflow.',
  startsAt: '2026-11-12T13:00:00-05:00', endsAt: '2026-11-12T14:00:00-05:00',
  type: 'discussion', tags: ['copilot', 'community']
};
const agenda = '## Agenda\n\n- Community updates\n- Questions and discussion\n';
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

async function writeSession(root, id = 'test-session', fields = metadata, body = agenda) {
  const directory = path.join(root, 'content', 'sessions', id);
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, 'index.md');
  await writeFile(file, `---\n${stringify(fields)}---\n\n${body}`);
  return { file, directory };
}

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'build-guild-site-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeJson(path.join(root, 'guild.json'), guild);
  return { root, ...await writeSession(root) };
}

test('sample sessions publish attendee pages with working root/subpath links and no kit downloads', async t => {
  const { root } = await fixture(t);
  await rm(path.join(root, 'content'), { recursive: true });
  await cp(path.join(repository, 'content'), path.join(root, 'content'), { recursive: true });
  const result = await build({ root, now });
  assert.deepEqual(result.sessions.map(session => session.status), ['upcoming', 'past', 'past']);
  const output = path.join(root, 'dist');
  async function check(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await check(file); continue; }
      if (!file.endsWith('.html')) continue;
      const html = await readFile(file, 'utf8');
      const relative = path.relative(output, file).split(path.sep).join('/');
      for (const prefix of ['', 'a-guild/']) {
        const base = `https://example.org/${prefix}${relative}`;
        for (const [, attribute] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
          if (attribute.startsWith('https://')) continue;
          const target = new URL(attribute.replaceAll('&amp;', '&'), base);
          assert.ok(target.pathname.startsWith(`/${prefix}`), `Escaped site subpath: ${attribute}`);
          const local = decodeURIComponent(target.pathname.slice(prefix.length + 1));
          const body = await readFile(path.join(output, ...local.split('/')), 'utf8');
          assert.ok(body.length, `Broken link ${attribute} in ${relative}`);
          if (target.hash) assert.ok(body.includes(`id="${target.hash.slice(1)}"`), `Missing anchor ${target.hash}`);
        }
      }
      assert.match(html, /Skip to content/);
      assert.doesNotMatch(html, /#catalog|Open session kit|facilitator|Contribute a kit|session\.json|Download Markdown/);
    }
  }
  await check(output);
  const home = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(home, /Upcoming sessions/);
  assert.match(home, /Past sessions/);
  assert.match(home, /agenda-preview/);
  assert.equal((home.match(/>Meeting minutes<\/a>/g) ?? []).length, 1);
  for (const session of result.sessions) {
    for (const name of ['index.md', 'README.md', 'session.json']) {
      await assert.rejects(readFile(path.join(output, 'sessions', session.id, name)), /ENOENT/);
    }
  }
  await assert.rejects(readFile(path.join(output, 'guild.json')), /ENOENT/);
});

test('an alternate Guild rebrands attendee pages without layout edits', async t => {
  const { root } = await fixture(t);
  await writeJson(path.join(root, 'guild.json'), {
    ...guild, name: 'Coastal Builders', accent: 'teal', timeZone: 'America/Los_Angeles',
    links: { registration: 'https://example.org/join?x=1&y=2' },
    organizers: [{ name: 'Public host', role: 'Facilitator', url: 'https://example.org/team' }]
  });
  await build({ root, now });
  const html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
  assert.match(html, /<title>Coastal Builders<\/title>/);
  assert.match(html, /data-accent="teal"/);
  assert.match(html, /10:00 AM/);
  assert.match(html, /Meet the organizers/);
  assert.match(html, /x=1&amp;y=2/);
  assert.doesNotMatch(html, /Example Guild|Your Build Guild|Suggest a topic|Watch recording/);
});

test('upcoming sessions require a real agenda, not a heading inside a code block or quote', async t => {
  const { root } = await fixture(t);
  for (const body of ['', '## Agenda\n', '```\n## Agenda\n- An example\n```\n', '> ## Agenda\n> Not a real agenda\n']) {
    await writeSession(root, 'test-session', metadata, body);
    await assert.rejects(loadContent(root, now), /index.md Agenda: upcoming sessions require/);
  }
  await writeSession(root, 'test-session', metadata, `${agenda}\n\`\`\`markdown\n## Meeting minutes\nExample only\n\`\`\`\n`);
  const { sessions } = await loadContent(root, now);
  assert.equal(sessions[0].body.hasMinutes, false);
  assert.match(sessions[0].body.html, /<pre>/);
});

test('past sessions can have no agenda or minutes; empty minutes do not generate headings or links', async t => {
  const { root } = await fixture(t);
  const past = { ...metadata, startsAt: '2026-01-01T10:00:00Z', endsAt: '2026-01-01T11:00:00Z' };
  for (const body of ['', '## Meeting minutes\n\n', '## Meeting minutes\n\n## Resources\n\nPublic summary.']) {
    await writeSession(root, 'test-session', past, body);
    const result = await build({ root, now });
    assert.equal(result.sessions[0].body.hasMinutes, false);
    assert.doesNotMatch(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), /#meeting-minutes/);
    assert.doesNotMatch(await readFile(path.join(root, 'dist', 'sessions', 'test-session', 'index.html'), 'utf8'), /id="meeting-minutes"/);
  }
});

test('public minutes are linked only for past sessions and have a working detail anchor', async t => {
  const { root } = await fixture(t);
  const body = `${agenda}\n## Meeting Minutes\n\n- Public decisions and next steps.\n`;
  await writeSession(root, 'test-session', {
    ...metadata, links: { recording: 'https://example.org/recording', slides: 'https://example.org/slides' }
  }, body);
  await build({ root, now });
  assert.doesNotMatch(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), /#meeting-minutes/);
  await build({ root, now: new Date(metadata.endsAt) });
  const html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
  assert.match(html, /sessions\/test-session\/index.html#meeting-minutes/);
  assert.match(html, /href="https:\/\/example.org\/recording">Watch recording/);
  assert.match(html, /href="https:\/\/example.org\/slides">View slides/);
  assert.match(await readFile(path.join(root, 'dist', 'sessions', 'test-session', 'index.html'), 'utf8'), /<h2 id="meeting-minutes">Meeting Minutes<\/h2>/);
});

test('duplicate reserved sections fail instead of choosing one silently', async t => {
  const { root } = await fixture(t);
  for (const body of [`${agenda}\n## agenda\n\nAnother agenda.`, `${agenda}\n## Meeting minutes\n\nOne.\n\n## Meeting minutes\n\nTwo.`]) {
    await writeSession(root, 'test-session', metadata, body);
    await assert.rejects(loadContent(root, now), /include this section only once/);
  }
});

test('classification uses the end time, with upcoming ascending and past descending', async t => {
  const { root } = await fixture(t);
  await rm(path.join(root, 'content'), { recursive: true });
  for (const [id, start, end] of [
    ['past-old', '2026-10-01T10:00:00Z', '2026-10-01T11:00:00Z'],
    ['past-recent', '2026-11-11T17:00:00Z', '2026-11-11T18:00:00Z'],
    ['in-progress', '2026-11-11T17:30:00Z', '2026-11-11T18:30:00Z'],
    ['future', '2026-12-01T10:00:00Z', '2026-12-01T11:00:00Z']
  ]) await writeSession(root, id, { ...metadata, startsAt: start, endsAt: end });
  const result = await loadContent(root, now);
  assert.deepEqual(result.sessions.map(session => [session.id, session.status]), [
    ['in-progress', 'upcoming'], ['future', 'upcoming'], ['past-recent', 'past'], ['past-old', 'past']
  ]);
});

test('invalid front matter is reported with the file and cannot replace successful output', async t => {
  const { root, file } = await fixture(t);
  await build({ root, now });
  const output = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
  const yaml = stringify(metadata);
  for (const source of [
    'No front matter', '---\ntitle: [broken\n---\n',
    `---\n${yaml}title: Duplicate title\n---\n${agenda}`,
    `---\n${yaml.replace(/^title:.+$/m, 'title: !custom "A public session"')}---\n${agenda}`,
    `---\n${yaml.replace(/^title:.+$/m, 'title: &name "A public session"').replace(/^summary:.+$/m, 'summary: *name')}---\n${agenda}`,
    '---\n- a list instead of metadata\n---\n'
  ]) {
    await writeFile(file, source);
    await assert.rejects(build({ root, now }), /index.md/);
    assert.equal(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), output);
  }
});

test('metadata validates dates, optional links and unknown fields without fallback', async t => {
  const { root } = await fixture(t);
  for (const fields of [
    { ...metadata, title: ' ' }, { ...metadata, startsAt: '2026-02-30T10:00:00Z' },
    { ...metadata, startsAt: '2026-11-12T13:00:00' }, { ...metadata, endsAt: metadata.startsAt },
    { ...metadata, status: 'upcoming' }, { ...metadata, sessionId: 'old-kit' },
    { ...metadata, tags: ['same', 'same'] }, { ...metadata, type: 'unknown' },
    { ...metadata, links: { recording: 'javascript:alert(1)' } },
    { ...metadata, links: { registration: 'https:example.org/register' } },
    { ...metadata, links: { registration: 'https://user:password@example.org' } }
  ]) {
    await writeSession(root, 'test-session', fields);
    await assert.rejects(loadContent(root, now), /index.md/);
  }
});

test('Windows Markdown line endings and quoted timestamps are accepted', async t => {
  const { root, file } = await fixture(t);
  const source = await readFile(file, 'utf8');
  await writeFile(file, `\uFEFF${source.replaceAll('\n', '\r\n')}`);
  const result = await loadContent(root, now);
  assert.equal(result.sessions[0].start, Date.parse(metadata.startsAt));
  assert.match(result.sessions[0].body.agenda, /Community updates/);
});

test('safe assets work in listing agendas and detail pages; unused files and raw HTML are not published', async t => {
  const { root, directory } = await fixture(t);
  await mkdir(path.join(directory, 'assets'));
  await writeFile(path.join(directory, 'assets', 'public.txt'), 'Public information');
  await writeFile(path.join(directory, 'assets', 'unused.txt'), 'Not referenced');
  await writeSession(root, 'test-session', { ...metadata, title: '<script>unsafe</script>' },
    `${agenda}\n[Public attachment](assets/public.txt)\n\n<script>alert("unsafe")</script>\n\nLiteral {{body}}.\n`);
  await build({ root, now });
  const home = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
  assert.match(home, /href="sessions\/test-session\/assets\/public.txt"/);
  const detail = await readFile(path.join(root, 'dist', 'sessions', 'test-session', 'index.html'), 'utf8');
  assert.match(detail, /href="assets\/public.txt"/);
  assert.match(detail, /&lt;script&gt;/);
  assert.match(detail, /Literal \{\{body\}\}/);
  assert.doesNotMatch(detail, /<script>unsafe/);
  assert.equal(await readFile(path.join(root, 'dist', 'sessions', 'test-session', 'assets', 'public.txt'), 'utf8'), 'Public information');
  await assert.rejects(readFile(path.join(root, 'dist', 'sessions', 'test-session', 'assets', 'unused.txt')), /ENOENT/);
});

test('unsafe links, missing assets and remote images fail explicitly', async t => {
  const { root, directory } = await fixture(t);
  await mkdir(path.join(directory, 'assets'));
  await writeFile(path.join(directory, 'assets', 'document.pdf'), 'Not an image');
  for (const resource of [
    '[unsafe](javascript:alert%281%29)', '[insecure](http://example.org)', '[escape](../guild.json)',
    '[encoded](assets/%2e%2e/guild.json)', '[missing](assets/missing.pdf)',
    '![remote](https://example.org/image.png)', '![not an image](assets/document.pdf)'
  ]) {
    await writeSession(root, 'test-session', metadata, `${agenda}\n${resource}`);
    await assert.rejects(loadContent(root, now), /index.md/);
  }
});

test('symbolic link assets cannot expose files outside the session', async t => {
  const { root, directory } = await fixture(t);
  await mkdir(path.join(directory, 'assets'));
  try { await symlink(path.join(root, 'guild.json'), path.join(directory, 'assets', 'secret.json')); }
  catch (error) {
    if (error.code === 'EPERM') { t.skip('Creating symbolic links requires Windows privileges'); return; }
    throw error;
  }
  await writeSession(root, 'test-session', metadata, `${agenda}\n[Not public](assets/secret.json)`);
  await assert.rejects(loadContent(root, now), /symbolic links are not supported/);
});

test('empty collections build and successful rebuilds remove obsolete kit pages and stale assets', async t => {
  const { root } = await fixture(t);
  await build({ root, now });
  const stale = path.join(root, 'dist', 'sessions', 'old-kit');
  await mkdir(path.join(stale, 'assets'), { recursive: true });
  await writeFile(path.join(stale, 'README.md'), 'Old facilitator content');
  await writeFile(path.join(stale, 'session.json'), '{}');
  await writeFile(path.join(stale, 'assets', 'private.txt'), 'Stale content');
  await rm(path.join(root, 'content'), { recursive: true });
  const result = await build({ root, now });
  assert.equal(result.sessions.length, 0);
  const html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
  assert.match(html, /No upcoming sessions are announced/);
  assert.match(html, /Past sessions will appear here/);
  assert.doesNotMatch(html, /<form|#catalog|Session kits/);
  await assert.rejects(readdir(path.join(root, 'dist', 'sessions')), /ENOENT/);
});

test('the starter can be published and receive minutes by editing only its Markdown', async t => {
  const { root } = await fixture(t);
  await rm(path.join(root, 'content'), { recursive: true });
  const directory = path.join(root, 'content', 'sessions', 'new-session');
  await cp(path.join(repository, 'docs', 'session-template'), directory, { recursive: true });
  const before = await build({ root, now });
  assert.equal(before.sessions[0].status, 'upcoming');
  const file = path.join(directory, 'index.md');
  await writeFile(file, `${await readFile(file, 'utf8')}\n## Meeting minutes\n\nPublic takeaways.\n`);
  const after = await build({ root, now: new Date('2027-01-21T00:00:00Z') });
  assert.equal(after.sessions[0].status, 'past');
  assert.equal(after.sessions[0].body.hasMinutes, true);
  assert.match(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), /new-session\/index.html#meeting-minutes/);
});

test('Guild time zones and metadata are validated even with no sessions', async t => {
  const { root } = await fixture(t);
  await rm(path.join(root, 'content'), { recursive: true });
  for (const invalid of [{ ...guild, timeZone: 'Not/AZone' }, { ...guild, timeZone: '+01:00' },
    { ...guild, links: { registration: 'http://example.org' } }, { ...guild, typo: 'unknown' }]) {
    await writeJson(path.join(root, 'guild.json'), invalid);
    await assert.rejects(loadContent(root, now), /guild.json/);
  }
});

test('calendar checks accept leap days and reject impossible dates or offsets', () => {
  assert.equal(timestamp('2028-02-29T13:00:00-05:00', 'session', 'date'), Date.parse('2028-02-29T18:00:00Z'));
  for (const value of ['2027-02-29T10:00:00Z', '2026-13-01T10:00:00Z', '2026-11-11T24:00:00Z',
    '2026-11-11T10:60:00Z', '2026-11-11T10:00:00+14:30', '2026-11-11']) {
    assert.throws(() => timestamp(value, 'session', 'date'), /session date:/);
  }
});

test('public search combines words with exact type and tag filtering', () => {
  const card = { search: 'Copilot community questions', type: 'discussion', tags: ['copilot', 'community'] };
  assert.equal(matches(card, { query: '  QUESTIONS copilot ', type: 'discussion', tag: 'community' }), true);
  for (const filters of [{ query: 'copilot missing' }, { type: 'workshop' }, { tag: 'comm' }]) {
    assert.equal(matches(card, filters), false);
  }
  assert.equal(matches(card, {}), true);
});
