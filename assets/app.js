import { matches } from './filters.js';

for (const collection of document.querySelectorAll('[data-collection]')) {
  const form = collection.querySelector('form');
  const counter = collection.querySelector('[role="status"]');
  const empty = collection.querySelector('[data-no-results]');
  const cards = [...collection.querySelectorAll('[data-card]')];
  const apply = () => {
    const filters = Object.fromEntries(new FormData(form));
    let count = 0;
    for (const card of cards) {
      const visible = matches({ ...card.dataset, tags: JSON.parse(card.dataset.tags) }, filters);
      card.hidden = !visible;
      if (visible) count++;
    }
    counter.textContent = `${count} of ${cards.length} ${collection.id === 'catalog' ? 'kits' : 'events'} shown`;
    empty.hidden = count !== 0 || cards.length === 0;
  };
  form.hidden = false;
  counter.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  form.addEventListener('reset', () => queueMicrotask(apply));
  apply();
}

const theme = document.querySelector('#theme');
const themes = ['system', 'light', 'dark'];
let current = 'system';
try {
  const saved = localStorage.getItem('build-guild-theme');
  if (themes.includes(saved)) current = saved;
} catch (error) {
  console.warn('Theme preference storage is unavailable; using the system theme.', error);
}
const setTheme = () => {
  document.documentElement.dataset.theme = current;
  theme.textContent = `Theme: ${current}`;
  theme.setAttribute('aria-label', `Color theme: ${current}. Activate to switch to ${themes[(themes.indexOf(current) + 1) % themes.length]}.`);
};
setTheme();
theme.hidden = false;
theme.addEventListener('click', () => {
  current = themes[(themes.indexOf(current) + 1) % themes.length];
  setTheme();
  try { localStorage.setItem('build-guild-theme', current); }
  catch (error) { console.warn('Theme changed, but the preference could not be saved.', error); }
});
