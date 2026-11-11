import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import MarkdownIt from 'markdown-it';

const schemaRoot = new URL('../schemas/', import.meta.url);
const ajv = new Ajv({ allErrors: true, strict: false });
for (const name of ['common', 'guild', 'session', 'event']) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`${name}.json`, schemaRoot), 'utf8')));
}
const markdown = new MarkdownIt({ html: false, linkify: false });
const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.md', '.json', '.csv', '.ipynb']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

export function fail(file, field, message) {
  throw new Error(`${file}${field ? ` ${field}` : ''}: ${message}`);
}

async function json(file, schema) {
  let value;
  try {
    value = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    fail(file, '', error.message);
  }
  const validate = ajv.getSchema(`${schema}.json`);
  if (!validate(value)) {
    fail(file, '', ajv.errorsText(validate.errors, { separator: '; ', dataVar: schema }));
  }
  return value;
}

export function httpsUrl(value, file, field) {
  let url;
  try { url = new URL(value); } catch { fail(file, field, 'expected an absolute HTTPS URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || /[\s\\<>"]/.test(value)) {
    fail(file, field, 'expected an HTTPS URL without credentials, whitespace, or backslashes');
  }
  return value;
}

export function timestamp(value, file, field) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) fail(file, field, 'use YYYY-MM-DDTHH:mm:ssZ or an explicit +/-HH:mm offset');
  const [, year, month, day, hour, minute, second, , offsetHour = '0', offsetMinute = '0'] = match;
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (Number(year) < 1000 || Number(month) < 1 || Number(month) > 12 ||
      Number(day) < 1 || Number(day) > lastDay || Number(hour) > 23 ||
      Number(minute) > 59 || Number(second) > 59 || Number(offsetHour) > 14 ||
      Number(offsetMinute) > 59 || (Number(offsetHour) === 14 && Number(offsetMinute) !== 0) ||
      !Number.isFinite(Date.parse(value))) {
    fail(file, field, 'invalid calendar date, time, or UTC offset');
  }
  return Date.parse(value);
}

// Reject symlinks in every component so a kit cannot publish files outside itself.
export async function regularFile(root, relative, file, field) {
  let current = root;
  for (const component of relative.split('/')) {
    current = path.join(current, component);
    let stat;
    try { stat = await lstat(current); } catch (error) { fail(file, field, error.message); }
    if (stat.isSymbolicLink()) fail(file, field, 'symbolic links are not supported');
  }
  if (!(await lstat(current)).isFile()) fail(file, field, 'expected a regular file');
  return current;
}

async function resourceUrl(value, directory, file, field, assets) {
  if (value.startsWith('https://')) return httpsUrl(value, file, field);
  if (!/^assets\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/.test(value) ||
      !assetExtensions.has(path.extname(value).toLowerCase())) {
    fail(file, field, 'use HTTPS or a safe assets/ path with a supported file extension');
  }
  const source = await regularFile(directory, value, file, field);
  assets.set(value, source);
  return value;
}

async function markdownBody(directory, assets) {
  const file = await regularFile(directory, 'README.md', directory, 'README.md');
  const source = await readFile(file, 'utf8');
  if (!source.trim()) fail(file, '', 'session material must not be empty');
  // markdown-it leaves blocked links as text; report them instead of silently publishing.
  const parser = new MarkdownIt({ html: false });
  parser.validateLink = () => true;
  const tokens = parser.parse(source, {});
  const inspect = async (items) => {
    for (const token of items) {
      if (token.type === 'link_open' || token.type === 'image') {
        const attribute = token.type === 'image' ? 'src' : 'href';
        const value = token.attrGet(attribute);
        if (token.type === 'image' &&
            (!value.startsWith('assets/') || !imageExtensions.has(path.extname(value).toLowerCase()))) {
          fail(file, attribute, 'images must be local PNG, JPEG, GIF, or WebP kit assets');
        }
        await resourceUrl(value, directory, file, attribute, assets);
      }
      if (token.children) await inspect(token.children);
    }
  };
  await inspect(tokens);
  return { source, html: markdown.render(source) };
}

async function entries(root, name) {
  const directory = path.join(root, name);
  let result;
  try {
    if ((await lstat(directory)).isSymbolicLink()) fail(directory, '', 'symbolic links are not supported');
    result = await readdir(directory, { withFileTypes: true });
  }
  catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  for (const entry of result) {
    if (entry.isSymbolicLink()) fail(directory, entry.name, 'symbolic links are not supported');
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadContent(root, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid build clock');
  const guildFile = await regularFile(root, 'guild.json', root, 'guild.json');
  const guild = await json(guildFile, 'guild');
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(guild.timeZone)) {
    fail(guildFile, 'timeZone', 'expected a supported IANA time zone, not a numeric offset');
  }
  try { new Intl.DateTimeFormat('en', { timeZone: guild.timeZone }); }
  catch { fail(guildFile, 'timeZone', 'expected a supported IANA time zone'); }
  for (const [field, url] of Object.entries(guild.links ?? {})) httpsUrl(url, guildFile, `links.${field}`);
  for (const [index, organizer] of (guild.organizers ?? []).entries()) {
    if (organizer.url) httpsUrl(organizer.url, guildFile, `organizers[${index}].url`);
  }
  const sessions = [];
  for (const entry of await entries(root, 'sessions')) {
    if (!entry.isDirectory()) fail('sessions', entry.name, 'each entry must be a kit directory');
    const directory = path.join(root, 'sessions', entry.name);
    const file = await regularFile(directory, 'session.json', directory, 'session.json');
    const session = await json(file, 'session');
    if (session.id !== entry.name) fail(file, 'id', 'must match the kit directory name');
    const assets = new Map();
    for (const [index, resource] of session.resources.entries()) {
      await resourceUrl(resource.url, directory, file, `resources[${index}].url`, assets);
    }
    for (const [index, source] of (session.sources ?? []).entries()) {
      httpsUrl(source.url, file, `sources[${index}].url`);
    }
    sessions.push({ ...session, assets, body: await markdownBody(directory, assets), directory });
  }
  if (!sessions.length) fail('sessions', '', 'include at least one session kit or idea');
  const sessionById = new Map(sessions.map(session => [session.id, session]));
  const events = [];
  const ids = new Set();
  for (const entry of await entries(root, 'events')) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) fail('events', entry.name, 'expected an event JSON file');
    const file = await regularFile(root, `events/${entry.name}`, root, 'events');
    const event = await json(file, 'event');
    if (entry.name !== `${event.id}.json`) fail(file, 'id', 'must match the event filename');
    if (ids.has(event.id)) fail(file, 'id', 'duplicate event ID');
    ids.add(event.id);
    const start = timestamp(event.startsAt, file, 'startsAt');
    const end = timestamp(event.endsAt, file, 'endsAt');
    if (end <= start) fail(file, 'endsAt', 'must be after startsAt');
    const session = sessionById.get(event.sessionId);
    if (event.origin === 'guild' && !session) fail(file, 'sessionId', 'unknown session kit');
    if (session?.status === 'idea') fail(file, 'sessionId', 'promote the idea to ready before scheduling it');
    for (const [field, url] of Object.entries(event.links ?? {})) httpsUrl(url, file, `links.${field}`);
    events.push({
      ...event,
      title: session?.title ?? event.title,
      summary: session?.summary ?? event.summary,
      type: session?.type ?? event.type,
      tags: session?.tags ?? event.tags,
      status: end > now.getTime() ? 'upcoming' : 'past',
      start,
      end
    });
  }
  events.sort((a, b) => a.status !== b.status ? (a.status === 'upcoming' ? -1 : 1) :
    a.status === 'upcoming' ? a.start - b.start : b.start - a.start);
  return { guild, sessions, events, now };
}
