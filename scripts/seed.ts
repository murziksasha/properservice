import { promises as fs } from 'fs';
import path from 'path';
import { defaultSiteData } from '../lib/default-site-data';
import { getDataFilePathForScripts } from '../lib/site-data';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const targetPath = getDataFilePathForScripts();
  const seedPath = path.join(process.cwd(), 'data', 'site.json');
  const examplePath = path.join(process.cwd(), 'data', 'site.example.json');

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.mkdir(path.dirname(seedPath), { recursive: true });

  const targetAlreadyExists = await fileExists(targetPath);
  if (targetAlreadyExists && !force) {
    console.log(
      `[seed] Site data already exists at "${targetPath}". Skipping to prevent data loss. (Pass --force to overwrite)`,
    );
    return;
  }

  // Load baseline from site.example.json or defaultSiteData
  let body: string;
  if (await fileExists(examplePath)) {
    body = await fs.readFile(examplePath, 'utf-8');
  } else {
    body = JSON.stringify(defaultSiteData, null, 2);
    await fs.writeFile(examplePath, body, 'utf-8');
  }

  await fs.writeFile(targetPath, body, 'utf-8');
  if (seedPath !== targetPath) {
    await fs.writeFile(seedPath, body, 'utf-8');
  }

  console.log(`[seed] Seeded site data to ${targetPath}`);
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
