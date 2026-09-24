/** Publish discovery identifiers without shipping game assets or internal tree data.
 * node scripts/sync-animation-inventories.mjs --from ../open77-base [--check]
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const args = process.argv.slice(2);
let source;
let check = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from') source = args[++i];
  else if (args[i] === '--check') check = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
assert.ok(source, '--from requires a platform checkout');
const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const files = ['docs/data/emote-animations.txt', 'docs/data/rp-workspots.json'];
assert.equal(execFileSync('git', ['-C', source, 'status', '--porcelain', '--', ...files], { encoding: 'utf8' }).trim(), '', 'Commit inventory sources before publishing');
const raw = await Promise.all(files.map(file => readFile(path.join(source, file), 'utf8')));
const names = raw[0].replaceAll('\r\n', '\n').trim().split('\n');
assert.ok(names.length > 0 && names.every(name => name && !/[\x00-\x1f]/.test(name)));
const inventory = JSON.parse(raw[1]);
const workspots = inventory.workspots.map(row => ({
  workspot: row.workspot,
  clips: row.clips.map(clip => clip.name),
}));
assert.equal(workspots.length, inventory.workspotCount);
const uniqueClipCount = new Set(workspots.flatMap(row => row.clips)).size;
assert.equal(uniqueClipCount, inventory.uniqueClipCount);
const outputs = new Map([
  ['emote-animations.txt', names.join('\n') + '\n'],
  ['rp-workspots.json', JSON.stringify({
    schema: 1, gameVersion: inventory.gameVersion, scope: inventory.scope,
    evidence: 'asset_discovery_not_a_playback_allowlist',
    description: 'Discovery identifiers only. Entries are not promises of runtime playback. Angle-bracket names are engine markers, not playable clips.',
    workspotCount: workspots.length, uniqueClipCount, workspots,
  }, null, 2) + '\n'],
]);
const manifest = { schema: 1, sourceRevision: revision, gameVersion: inventory.gameVersion,
  evidence: 'asset_discovery_not_a_playback_allowlist',
  files: [...outputs].map(([name, text], index) => ({
    url: `/data/${name}`, source: files[index],
    entries: index === 0 ? names.length : workspots.length,
    bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex'),
  })),
};
outputs.set('animation-inventories.json', JSON.stringify(manifest, null, 2) + '\n');
if (!check) await mkdir('public/data', { recursive: true });
for (const [name, text] of outputs) {
  const target = `public/data/${name}`;
  if (check) assert.equal(await readFile(target, 'utf8'), text, target);
  else await writeFile(target, text);
}
console.log(`${check ? 'Checked' : 'Published'} ${names.length} clip names and ${uniqueClipCount} workspot names across ${workspots.length} workspots.`);
