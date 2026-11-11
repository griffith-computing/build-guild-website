import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, cp, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, timestamp } from '../scripts/content.mjs';
import { build } from '../scripts/build.mjs';
import { matches } from '../assets/filters.js';

const now = new Date('2026-11-11T18:00:00Z');
const repository = fileURLToPath(new URL('../', import.meta.url));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const guild = {
  name: 'Test Guild', description: 'Public learning community', intro: 'Try a small idea.',
  cadence: 'Monthly', timeZone: 'America/New_York'
};
const session = {
  id: 'test-kit', title: 'Test kit', summary: 'A focused learning exercise', status: 'ready',
  type: 'workshop', level: 'beginner', durationMinutes: 45, audience: ['Developers'],
  tags: ['quality', 'copilot'], prerequisites: [], objectives: ['Review observable evidence'], resources: []
};
const event = {
  id: 'test-event', origin: 'guild', sessionId: 'test-kit',
  startsAt: '2026-11-12T13:00:00-05:00', endsAt: '2026-11-12T14:00:00-05:00'
};

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'build-guild-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const kit = path.join(root, 'sessions', 'test-kit');
  await mkdir(kit, { recursive: true });
  await mkdir(path.join(root, 'events'));
  await writeJson(path.join(root, 'guild.json'), guild);
  await writeJson(path.join(kit, 'session.json'), session);
  await writeFile(path.join(kit, 'README.md'), '## Exercise\n\nReview a small change.\n');
  await writeJson(path.join(root, 'events', 'test-event.json'), event);
  return { root, kit };
}

test('starter content builds and every published local link resolves at root and a repository subpath', async t => {
  const { root } = await fixture(t);
  await rm(path.join(root, 'sessions'), { recursive: true });
  await rm(path.join(root, 'events'), { recursive: true });
  await cp(path.join(repository, 'sessions'), path.join(root, 'sessions'), { recursive: true });
  await cp(path.join(repository, 'events'), path.join(root, 'events'), { recursive: true });
  await cp(path.join(repository, 'guild.json'), path.join(root, 'guild.json'));
  const result = await build({ root, now });
  assert.equal(result.sessions.filter(item => item.status === 'idea').length, 1);
  assert.deepEqual(result.events.map(item => item.status), ['upcoming', 'past']);
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
          assert.ok((await readFile(path.join(output, ...local.split('/')))).length, `Broken link ${attribute} in ${relative}`);
          if (target.hash) {
            const targetHtml = await readFile(path.join(output, ...local.split('/')), 'utf8');
            assert.ok(targetHtml.includes(`id="${target.hash.slice(1)}"`), `Missing anchor ${target.hash}`);
          }
        }
      }
      assert.match(html, /<main id="main"/);
      assert.match(html, /Skip to content/);
    }
  }
  await check(output);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /Template preview/);
  assert.match(html, /Example only/);
  assert.match(html, /data-card/);
  assert.match(html, /class="filters" hidden/);
  assert.match(html, /Give Copilot useful context/);
  assert.doesNotMatch(html, /Meet the organizers/);
  const metadata = JSON.parse(await readFile(path.join(output, 'sessions', 'copilot-context', 'session.json'), 'utf8'));
  assert.equal(metadata.$schema, undefined);
  assert.match(await readFile(path.join(output, 'sessions', 'copilot-context', 'assets', 'prompt-worksheet.md'), 'utf8'), /CC BY 4.0/);
  await assert.rejects(readFile(path.join(output, 'guild.json')), /ENOENT/);
});

test('a different Guild rebrands without layout edits and optional sections are omitted', async t => {
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
  assert.doesNotMatch(html, /Template preview|Your Build Guild|Suggest a topic|Watch recording/);
});

test('missing events are allowed; ideas have no date and cannot be scheduled', async t => {
  const { root, kit } = await fixture(t);
  await writeJson(path.join(kit, 'session.json'), { ...session, status: 'idea' });
  await assert.rejects(loadContent(root, now), /sessionId: promote the idea to ready/);
  await rm(path.join(root, 'events'), { recursive: true });
  await build({ root, now });
  assert.match(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), /No events scheduled yet/);
  assert.match(await readFile(path.join(root, 'dist', 'sessions', 'test-kit', 'index.html'), 'utf8'), /Idea, not a ready-to-run session/);
});

test('event status uses end time and order is upcoming ascending then past descending', async t => {
  const { root } = await fixture(t);
  const values = [
    { id: 'past-old', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z' },
    { id: 'past-recent', startsAt: '2026-11-11T17:00:00Z', endsAt: '2026-11-11T18:00:00Z' },
    { id: 'in-progress', startsAt: '2026-11-11T17:30:00Z', endsAt: '2026-11-11T18:30:00Z' },
    { id: 'future', startsAt: '2026-12-01T10:00:00Z', endsAt: '2026-12-01T11:00:00Z' }
  ];
  await rm(path.join(root, 'events', 'test-event.json'));
  for (const value of values) await writeJson(path.join(root, 'events', `${value.id}.json`), { ...event, ...value });
  const result = await loadContent(root, now);
  assert.deepEqual(result.events.map(item => [item.id, item.status]), [
    ['in-progress', 'upcoming'], ['future', 'upcoming'], ['past-recent', 'past'], ['past-old', 'past']
  ]);
});

test('external events are labeled independently and require registration', async t => {
  const { root } = await fixture(t);
  const external = { ...event, origin: 'external', title: 'An external workshop', summary: 'Hosted elsewhere',
    type: 'showcase', tags: ['community'], links: { registration: 'https://example.org/event' } };
  delete external.sessionId;
  await writeJson(path.join(root, 'events', 'test-event.json'), external);
  await build({ root, now });
  assert.match(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), /external event/);
  delete external.links.registration;
  await writeJson(path.join(root, 'events', 'test-event.json'), external);
  await assert.rejects(loadContent(root, now), /registration/);
});

test('invalid content reports its file and field without replacing the last successful build', async t => {
  const { root } = await fixture(t);
  await build({ root, now });
  const output = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
  const invalidCases = [
    [{ ...event, sessionId: 'missing' }, /sessionId: unknown session kit/],
    [{ ...event, startsAt: '2026-02-30T10:00:00Z' }, /startsAt: invalid calendar/],
    [{ ...event, startsAt: '2026-11-12T13:00:00' }, /startsAt: use YYYY/],
    [{ ...event, endsAt: event.startsAt }, /endsAt: must be after/],
    [{ ...event, id: 'wrong-name' }, /id: must match the event filename/],
    [{ ...event, links: { notes: 'javascript:alert(1)' } }, /links.notes: expected an .*HTTPS/]
  ];
  for (const [invalid, expected] of invalidCases) {
    await writeJson(path.join(root, 'events', 'test-event.json'), invalid);
    await assert.rejects(build({ root, now }), error => /test-event.json/.test(error.message) && expected.test(error.message));
    assert.equal(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), output);
  }
});

test('rejects invalid time zones, links, schema fields, and kit identifiers', async t => {
  const { root, kit } = await fixture(t);
  for (const invalid of [
    { ...guild, timeZone: 'Not/AZone' }, { ...guild, timeZone: '+01:00' },
    { ...guild, links: { registration: 'https://user:password@example.org' } },
    { ...guild, links: { registration: 'http://example.org' } }, { ...guild, typo: 'ignored?' }
  ]) {
    await writeJson(path.join(root, 'guild.json'), invalid);
    await assert.rejects(loadContent(root, now), /guild.json/);
  }
  await writeJson(path.join(root, 'guild.json'), guild);
  for (const invalid of [
    { ...session, id: 'another-kit' }, { ...session, status: 'draft' },
    { ...session, durationMinutes: 0 }, { ...session, tags: ['same', 'same'] }
  ]) {
    await writeJson(path.join(kit, 'session.json'), invalid);
    await assert.rejects(loadContent(root, now), /session.json/);
  }
});

test('calendar validation handles leap years and explicit offsets', () => {
  assert.equal(timestamp('2028-02-29T13:00:00-05:00', 'event', 'date'), Date.parse('2028-02-29T18:00:00Z'));
  for (const value of ['2027-02-29T10:00:00Z', '2026-13-01T10:00:00Z', '2026-11-11T24:00:00Z',
    '2026-11-11T10:60:00Z', '2026-11-11T10:00:00+14:30', '2026-11-11']) {
    assert.throws(() => timestamp(value, 'event', 'date'), /event date:/);
  }
});

test('metadata and Markdown render safely while publishing only referenced assets', async t => {
  const { root, kit } = await fixture(t);
  await mkdir(path.join(kit, 'assets'));
  await writeFile(path.join(kit, 'assets', 'worksheet.txt'), 'Public worksheet');
  await writeFile(path.join(kit, 'assets', 'unreferenced.txt'), 'Do not publish');
  await writeFile(path.join(kit, 'README.md'), '## Guide\n\n<script>alert("unsafe")</script>\n\n[Worksheet](assets/worksheet.txt)\n\nLiteral {{body}}.');
  await writeJson(path.join(kit, 'session.json'), { ...session, title: '<img src=x onerror=alert(1)>' });
  await build({ root, now });
  const html = await readFile(path.join(root, 'dist', 'sessions', 'test-kit', 'index.html'), 'utf8');
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Literal \{\{body\}\}/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.equal(await readFile(path.join(root, 'dist', 'sessions', 'test-kit', 'assets', 'worksheet.txt'), 'utf8'), 'Public worksheet');
  await assert.rejects(readFile(path.join(root, 'dist', 'sessions', 'test-kit', 'assets', 'unreferenced.txt')), /ENOENT/);
});

test('Markdown unsafe links and invalid local resources fail explicitly', async t => {
  const { root, kit } = await fixture(t);
  await mkdir(path.join(kit, 'assets'));
  await writeFile(path.join(kit, 'assets', 'document.pdf'), 'A document fixture, not an image');
  for (const markdown of [
    '[unsafe](javascript:alert%281%29)', '[insecure](http://example.org)', '[escape](../guild.json)',
    '[encoded](assets/%2e%2e/guild.json)', '[missing](assets/missing.pdf)',
    '![remote](https://example.org/image.png)', '![not an image](assets/document.pdf)', '[anchor](#not-supported)'
  ]) {
    await writeFile(path.join(kit, 'README.md'), markdown);
    await assert.rejects(loadContent(root, now), /README.md/);
  }
});

test('symbolic link assets cannot publish files from outside the kit', async t => {
  const { root, kit } = await fixture(t);
  await mkdir(path.join(kit, 'assets'));
  try { await symlink(path.join(root, 'guild.json'), path.join(kit, 'assets', 'secret.json')); }
  catch (error) {
    if (error.code === 'EPERM') { t.skip('Creating symbolic links requires Windows privileges'); return; }
    throw error;
  }
  await writeFile(path.join(kit, 'README.md'), '[not allowed](assets/secret.json)');
  await assert.rejects(loadContent(root, now), /symbolic links are not supported/);
});

test('the documented new-kit template can be copied, developed, and scheduled', async t => {
  const { root } = await fixture(t);
  const destination = path.join(root, 'sessions', 'your-session');
  await cp(path.join(repository, 'docs', 'session-template'), destination, { recursive: true });
  let content = await loadContent(root, now);
  assert.equal(content.sessions.find(item => item.id === 'your-session').status, 'idea');
  const metadata = JSON.parse(await readFile(path.join(destination, 'session.json'), 'utf8'));
  metadata.status = 'ready';
  await writeJson(path.join(destination, 'session.json'), metadata);
  await writeJson(path.join(root, 'events', 'test-event.json'), {
    ...event, sessionId: 'your-session', links: { notes: 'https://example.org/notes', recording: 'https://example.org/recording' }
  });
  content = await build({ root, now });
  assert.equal(content.events[0].title, metadata.title);
  assert.match(await readFile(path.join(root, 'dist', 'index.html'), 'utf8'), /Read notes/);
});

test('search combines words with exact type, status, and tag filters', () => {
  const card = { search: 'Copilot testing Quality engineers', type: 'workshop', status: 'ready', tags: ['copilot', 'quality'] };
  assert.equal(matches(card, { query: '  QUALITY copilot  ', type: 'workshop', status: 'ready', tag: 'quality' }), true);
  for (const filters of [{ query: 'copilot missing' }, { type: 'discussion' }, { status: 'idea' }, { tag: 'qual' }]) {
    assert.equal(matches(card, filters), false);
  }
  assert.equal(matches(card, {}), true);
});
