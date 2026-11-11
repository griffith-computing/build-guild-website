import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv';
import MarkdownIt from 'markdown-it';
import { parseDocument } from 'yaml';

const schemaRoot = new URL('../schemas/', import.meta.url);
const ajv = new Ajv({ allErrors: true, strict: false });
for (const name of ['common', 'guild', 'session']) {
  ajv.addSchema(JSON.parse(await readFile(new URL(`${name}.json`, schemaRoot), 'utf8')));
}
const validSlug = ajv.getSchema('common.json#/definitions/id');
const markdown = new MarkdownIt({ html: false, linkify: false });
const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.md', '.json', '.csv', '.ipynb']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

export function fail(file, field, message) {
  throw new Error(`${file}${field ? ` ${field}` : ''}: ${message}`);
}

function validate(value, schema, file) {
  const check = ajv.getSchema(`${schema}.json`);
  if (!check(value)) fail(file, '', ajv.errorsText(check.errors, { separator: '; ', dataVar: schema }));
  return value;
}

export function httpsUrl(value, file, field) {
  let url;
  try { url = new URL(value); } catch { fail(file, field, 'expected an absolute HTTPS URL'); }
  if (!/^https:\/\//i.test(value) || url.protocol !== 'https:' || url.username || url.password || /[\s\\<>"]/.test(value)) {
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

async function checkedPath(root, relative) {
  let current = root;
  let stat;
  for (const component of relative.split('/')) {
    current = path.join(current, component);
    stat = await lstat(current);
    if (stat.isSymbolicLink()) fail(current, '', 'symbolic links are not supported');
  }
  return { current, stat };
}

export async function regularFile(root, relative, file, field) {
  let result;
  try { result = await checkedPath(root, relative); }
  catch (error) { fail(file, field, error.message); }
  if (!result.stat.isFile()) fail(file, field, 'expected a regular file');
  return result.current;
}

async function resourceUrl(value, directory, file, field, assets) {
  if (/^https:\/\//i.test(value)) return httpsUrl(value, file, field);
  if (!/^assets\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/.test(value) ||
      !assetExtensions.has(path.extname(value).toLowerCase())) {
    fail(file, field, 'use HTTPS or a safe assets/ path with a supported file extension');
  }
  assets.set(value, await regularFile(directory, value, file, field));
}

function frontMatter(source, file) {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(normalized);
  if (!match) fail(file, 'front matter', 'start with YAML between two --- lines');
  const document = parseDocument(match[1], { schema: 'core', uniqueKeys: true });
  if (document.errors.length || document.warnings.length) {
    fail(file, 'front matter', [...document.errors, ...document.warnings].map(error => error.message).join('; '));
  }
  let metadata;
  try { metadata = document.toJS({ maxAliasCount: 0 }); }
  catch (error) { fail(file, 'front matter', error.message); }
  return { metadata: validate(metadata, 'session', file), source: normalized.slice(match[0].length) };
}

async function renderBody(source, directory, file, assets) {
  // Inspect even links the renderer normally blocks, so invalid content fails explicitly.
  const inspector = new MarkdownIt({ html: false });
  inspector.validateLink = () => true;
  const inspect = async items => {
    for (const token of items) {
      if (token.type === 'link_open' || token.type === 'image') {
        const attribute = token.type === 'image' ? 'src' : 'href';
        const value = token.attrGet(attribute);
        if (token.type === 'image' &&
            (!value.startsWith('assets/') || !imageExtensions.has(path.extname(value).toLowerCase()))) {
          fail(file, attribute, 'images must be local PNG, JPEG, GIF, or WebP session assets');
        }
        await resourceUrl(value, directory, file, attribute, assets);
      }
      if (token.children) await inspect(token.children);
    }
  };
  await inspect(inspector.parse(source, {}));
  const tokens = markdown.parse(source, {});
  const sections = new Map();
  const omitted = new Set();
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== 'heading_open' || token.tag !== 'h2' || token.level !== 0) continue;
    const name = tokens[index + 1].content.trim().toLowerCase();
    if (!['agenda', 'meeting minutes'].includes(name)) continue;
    if (sections.has(name)) fail(file, name, 'include this section only once');
    let end = index + 3;
    while (end < tokens.length &&
      !(tokens[end].type === 'heading_open' && tokens[end].level === 0 && ['h1', 'h2'].includes(tokens[end].tag))) end++;
    const body = tokens.slice(index + 3, end);
    const nonempty = body.some(item => ['inline', 'fence', 'code_block'].includes(item.type) && item.content.trim());
    const id = name.replaceAll(' ', '-');
    if (nonempty) token.attrSet('id', id);
    else for (let omittedIndex = index; omittedIndex < end; omittedIndex++) omitted.add(omittedIndex);
    sections.set(name, { nonempty, html: markdown.renderer.render(body, markdown.options, {}) });
  }
  return {
    html: markdown.renderer.render(tokens.filter((_, index) => !omitted.has(index)), markdown.options, {}),
    agenda: sections.get('agenda')?.nonempty ? sections.get('agenda').html : '',
    hasMinutes: sections.get('meeting minutes')?.nonempty ?? false,
    search: tokens.filter(token => token.type === 'inline').map(token => token.content).join(' ')
  };
}

async function sessionDirectories(root) {
  const relative = 'content/sessions';
  let directory;
  try { directory = await checkedPath(root, relative); }
  catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!directory.stat.isDirectory()) fail(directory.current, '', 'expected a directory');
  const entries = await readdir(directory.current, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || !validSlug(entry.name)) {
      fail(directory.current, entry.name, 'each session must be a regular kebab-case directory');
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadContent(root, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid build clock');
  const guildFile = await regularFile(root, 'guild.json', root, 'guild.json');
  let guildData;
  try { guildData = JSON.parse(await readFile(guildFile, 'utf8')); }
  catch (error) { fail(guildFile, '', error.message); }
  const guild = validate(guildData, 'guild', guildFile);
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
  for (const entry of await sessionDirectories(root)) {
    const relative = `content/sessions/${entry.name}/index.md`;
    const file = await regularFile(root, relative, relative, 'index.md');
    const directory = path.dirname(file);
    const { metadata, source } = frontMatter(await readFile(file, 'utf8'), file);
    const start = timestamp(metadata.startsAt, file, 'startsAt');
    const end = timestamp(metadata.endsAt, file, 'endsAt');
    if (end <= start) fail(file, 'endsAt', 'must be after startsAt');
    for (const [field, url] of Object.entries(metadata.links ?? {})) httpsUrl(url, file, `links.${field}`);
    const assets = new Map();
    const body = await renderBody(source, directory, file, assets);
    const status = end > now.getTime() ? 'upcoming' : 'past';
    if (status === 'upcoming' && !body.agenda) fail(file, 'Agenda', 'upcoming sessions require a nonempty ## Agenda section');
    sessions.push({ ...metadata, id: entry.name, type: metadata.type ?? 'session', tags: metadata.tags ?? [],
      start, end, status, assets, body });
  }
  sessions.sort((a, b) => a.status !== b.status ? (a.status === 'upcoming' ? -1 : 1) :
    a.status === 'upcoming' ? a.start - b.start : b.start - a.start);
  return { guild, sessions, now };
}
