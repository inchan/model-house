#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [imagePath, outputPath] = process.argv.slice(2);
if (!imagePath || !outputPath) {
  console.error('usage: node scripts/floorplan-codex.mjs <image> <output.json>');
  process.exit(2);
}
const schema = path.resolve('floorplans/schema/codex-output.schema.json');
await mkdir(path.dirname(path.resolve(outputPath)), {recursive:true});
const prompt = [
  'Analyze the supplied Korean apartment floorplan.',
  'Return only the requested structured result.',
  'Do not invent dimensions. If a coordinate is not directly dimensioned, mark its evidence kind inferred.',
  'Preserve Korean source labels exactly.',
  'Walls are center lines in millimetres, origin top-left, +x right, +y down.',
  'If scale cannot be established, use a self-consistent provisional coordinate system but mark every affected geometry observation inferred.',
  'Do not force pantry, outdoor-unit room, powder room or other labels into model-house semantics.'
].join('\n');

const args = ['exec','--ephemeral','--skip-git-repo-check','--output-schema',schema,'--image',path.resolve(imagePath),'-o',path.resolve(outputPath),prompt];
const child = spawn('codex', args, {stdio:['ignore','inherit','inherit']});
const code = await new Promise((resolve,reject) => {
  child.on('error', reject);
  child.on('exit', c => resolve(c ?? 1));
});
if (code !== 0) process.exit(code);
const raw = await readFile(outputPath,'utf8');
const parsed = JSON.parse(raw);
await writeFile(outputPath, JSON.stringify(parsed,null,2)+'\n');
console.log('wrote', outputPath);
