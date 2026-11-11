import { readFile, mkdir, writeFile, copyFile, rm, rename, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from './content.mjs';
import { home, sessionPage, page } from './render.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function build({ root = projectRoot, now = new Date(), validateOnly = false } = {}) {
  const content = await loadContent(root, now);
  if (validateOnly) return content;
  const template = await readFile(new URL('../templates/page.html', import.meta.url), 'utf8');
  const stage = path.join(root, '.dist-stage');
  const output = path.join(root, 'dist');
  const previous = path.join(root, '.dist-previous');
  // Never follow a pre-existing generated-directory symlink during cleanup or writing.
  for (const directory of [stage, output, previous]) {
    try {
      if ((await lstat(directory)).isSymbolicLink()) throw new Error(`Refusing generated-directory symlink: ${directory}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await rm(stage, { recursive: true, force: true });
  try {
    await mkdir(path.join(stage, 'assets'), { recursive: true });
    for (const asset of ['site.css', 'app.js', 'filters.js']) {
      await copyFile(new URL(`../assets/${asset}`, import.meta.url), path.join(stage, 'assets', asset));
    }
    await mkdir(path.join(stage, 'licenses'));
    for (const license of ['LICENSE', 'LICENSE-CONTENT.txt']) {
      await copyFile(new URL(`../${license}`, import.meta.url), path.join(stage, 'licenses', license));
    }
    await writeFile(path.join(stage, 'index.html'), page(template, content, home(content), content.guild.name));
    for (const session of content.sessions) {
      const directory = path.join(stage, 'sessions', session.id);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), page(template, content, sessionPage(session, content.guild), `${session.title} | ${content.guild.name}`, '../../'));
      for (const [relative, source] of session.assets) {
        const destination = path.join(directory, ...relative.split('/'));
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(source, destination);
      }
    }
    await rm(previous, { recursive: true, force: true });
    let replaced = false;
    try { await rename(output, previous); replaced = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(stage, output); }
    catch (error) {
      if (replaced) await rename(previous, output);
      throw error;
    }
    await rm(previous, { recursive: true, force: true });
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
  return content;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--validate')) throw new Error('Usage: node scripts/build.mjs [--validate]');
    const result = await build({ validateOnly: args.includes('--validate') });
    console.log(`${args.includes('--validate') ? 'Validated' : 'Built dist:'} ${result.sessions.length} sessions for ${result.guild.name}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
