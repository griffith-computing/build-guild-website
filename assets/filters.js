export function matches(card, { query = '', type = '', status = '', tag = '' }) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.every(word => card.search.toLowerCase().includes(word)) &&
    (!type || card.type === type) && (!status || card.status === status) &&
    (!tag || card.tags.includes(tag));
}
