import { writeFileSync } from 'node:fs';

export function options(args, defaults, integerKeys, positiveKeys = []) {
  const values = { ...defaults };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || !Object.hasOwn(defaults, key) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new TypeError(`Đối số không hợp lệ: ${args[i]}`);
    }
    values[key] = args[i + 1];
  }
  for (const key of integerKeys) {
    values[key] = Number(values[key]);
    if (!Number.isSafeInteger(values[key]) || (positiveKeys.includes(key) && values[key] <= 0)) {
      throw new TypeError(`Giá trị không hợp lệ: --${key}`);
    }
  }
  return values;
}

export function writeJson(path, data) {
  const json = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(path, json);
  process.stdout.write(json);
}
