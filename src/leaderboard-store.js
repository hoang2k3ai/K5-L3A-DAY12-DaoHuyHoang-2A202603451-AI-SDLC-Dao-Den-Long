import { makeEntry, rankEntries } from './leaderboard.js';

const storageKey = 'dao-den-long:leaderboard:v1';
const serverAvailable = fetch('./api/leaderboard').then((response) =>
  response.ok && response.headers.get('content-type')?.includes('application/json'),
).catch(() => false);

function localEntries() {
  return rankEntries(JSON.parse(localStorage.getItem(storageKey) ?? '[]'));
}

export async function readLeaderboard() {
  if (!await serverAvailable) return localEntries();
  const response = await fetch('./api/leaderboard');
  if (!response.ok) throw new Error('Không đọc được bảng xếp hạng.');
  return (await response.json()).entries;
}

export async function saveLeaderboard(data) {
  if (!await serverAvailable) {
    localStorage.setItem(storageKey, JSON.stringify(rankEntries([...localEntries(), makeEntry(data)])));
    return;
  }
  const response = await fetch('./api/leaderboard', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Không lưu được điểm.');
}
