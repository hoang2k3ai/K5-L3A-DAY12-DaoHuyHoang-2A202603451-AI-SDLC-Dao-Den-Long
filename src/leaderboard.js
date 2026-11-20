export const validName = (name) => typeof name === 'string' && /^[A-Za-z0-9_]{3,12}$/.test(name);

export function rankEntries(entries) {
  return [...entries].sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, 10);
}

export function makeEntry({ name, score, nights_won, seed }, timestamp = new Date()) {
  if (!validName(name) || !Number.isSafeInteger(score) || score < 0 ||
      !Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3 || !Number.isSafeInteger(seed)) {
    throw new TypeError('Tên hoặc kết quả không hợp lệ.');
  }
  return { name, score, nights_won, achieved_at: timestamp.toISOString(), seed };
}
