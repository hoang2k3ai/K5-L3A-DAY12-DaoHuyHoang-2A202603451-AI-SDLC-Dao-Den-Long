// Enables the repository git hooks after `npm install`. Never fails the install:
// hooks are a convenience, CI is the real guard.
import { spawnSync } from 'node:child_process';

const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
if (result.status !== 0) {
  console.log('skip: could not enable .githooks (git not available)');
}
