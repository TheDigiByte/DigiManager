const fs = require('fs');
const path = require('path');

const targetDir = process.cwd();
const newVerRaw = process.argv[2];

if (!newVerRaw) {
  // If no argument, just output current version
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8'));
    console.log(pkg.version || '0.1.0');
  } catch (e) {
    console.log('0.1.0');
  }
  process.exit(0);
}

const newVer = newVerRaw.replace(/^[vV]/, '').trim();

if (!newVer) {
  console.error('Invalid version');
  process.exit(1);
}

function toSemVer(v) {
  const parts = v.split(/[\.\-]/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
  if (parts.length === 0) return '0.1.0';
  if (parts.length === 1) return `${parts[0]}.0.0`;
  if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

const semver = toSemVer(newVer);
let modified = [];

// 1. package.json
const pkgPath = path.join(targetDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = semver;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  modified.push('package.json');
}

// 2. src-tauri/tauri.conf.json
const tauriConfPath = path.join(targetDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauri = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauri.version = semver;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauri, null, 2) + '\n', 'utf8');
  modified.push('src-tauri/tauri.conf.json');
}

// 3. src/config.ts
const configPath = path.join(targetDir, 'src', 'config.ts');
if (fs.existsSync(configPath)) {
  let cfg = fs.readFileSync(configPath, 'utf8');
  cfg = cfg.replace(/APP_VERSION\s*=\s*['"][^'"]+['"]/, `APP_VERSION = '${newVer}'`);
  fs.writeFileSync(configPath, cfg, 'utf8');
  modified.push('src/config.ts');
}

// 4. src-tauri/Cargo.toml
const cargoPath = path.join(targetDir, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargo = fs.readFileSync(cargoPath, 'utf8');
  cargo = cargo.replace(/(\[package\][\s\S]*?version\s*=\s*)"[^"]+"/, `$1"${semver}"`);
  fs.writeFileSync(cargoPath, cargo, 'utf8');
  modified.push('src-tauri/Cargo.toml');
}

console.log(`UPDATED:${newVer}:${modified.join(',')}`);
