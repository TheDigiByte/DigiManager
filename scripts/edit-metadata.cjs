const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(query, defaultVal = '') {
  return new Promise((resolve) => {
    const hint = defaultVal ? ` (default: "${defaultVal}"): ` : ': ';
    rl.question(query + hint, (answer) => {
      const trimmed = answer.trim();
      resolve(trimmed === '' ? defaultVal : trimmed);
    });
  });
}

function parseVersionNumbers(verStr) {
  const parts = (verStr || '0.1.0.0').split(/[\.\,\-]/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
}

async function findDefaultExe(dir) {
  const candidates = [
    path.join(dir, 'src-tauri', 'target', 'release', 'DigiManager.exe'),
    path.join(dir, 'src-tauri', 'target', 'release', 'digimanager.exe'),
    path.join(dir, '..', 'src-tauri', 'target', 'release', 'DigiManager.exe'),
    path.join(dir, 'DigiManager.exe'),
    path.join(dir, 'digimanager.exe')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return path.resolve(c);
  }
  return null;
}

function findProjectRoot(startDir) {
  let curr = path.resolve(startDir);
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json')) && fs.existsSync(path.join(curr, 'src-tauri'))) {
      return curr;
    }
    if (fs.existsSync(path.join(curr, 'DigiManager', 'package.json'))) {
      return path.join(curr, 'DigiManager');
    }
    curr = path.dirname(curr);
  }
  return null;
}

async function readExeMetadata(exePath) {
  const bin = fs.readFileSync(exePath);
  const exe = ResEdit.NtExecutable.from(bin);
  const res = ResEdit.NtExecutableResource.from(exe);
  const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);

  let meta = {
    CompanyName: 'DigiByte Team',
    FileDescription: 'DigiManager Application',
    FileVersion: '0.1.1',
    LegalCopyright: 'Copyright © ' + new Date().getFullYear() + ' DigiByte. All rights reserved.',
    ProductName: 'DigiManager',
    ProductVersion: '0.1.1',
    OriginalFilename: path.basename(exePath),
    InternalName: path.parse(exePath).name
  };

  if (viList && viList.length > 0) {
    const vi = viList[0];
    const langs = vi.getAllLanguagesForStringValues ? vi.getAllLanguagesForStringValues() : [{ lang: 0, codepage: 1200 }, { lang: 1033, codepage: 1200 }];
    
    for (const langObj of langs) {
      const strings = vi.getStringValues(langObj);
      if (strings && Object.keys(strings).length > 0) {
        if (strings.CompanyName) meta.CompanyName = strings.CompanyName;
        if (strings.FileDescription) meta.FileDescription = strings.FileDescription;
        if (strings.FileVersion) meta.FileVersion = strings.FileVersion;
        if (strings.LegalCopyright) meta.LegalCopyright = strings.LegalCopyright;
        if (strings.ProductName) meta.ProductName = strings.ProductName;
        if (strings.ProductVersion) meta.ProductVersion = strings.ProductVersion;
        if (strings.OriginalFilename) meta.OriginalFilename = strings.OriginalFilename;
        if (strings.InternalName) meta.InternalName = strings.InternalName;
        break;
      }
    }
  }

  return { meta, exe, res, viList };
}

async function writeExeMetadata(exePath, meta, iconPath = null) {
  const bin = fs.readFileSync(exePath);
  const exe = ResEdit.NtExecutable.from(bin);
  const res = ResEdit.NtExecutableResource.from(exe);

  let viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  let vi = (viList && viList.length > 0) ? viList[0] : ResEdit.Resource.VersionInfo.createEmpty();

  const [v1, v2, v3, v4] = parseVersionNumbers(meta.FileVersion || meta.ProductVersion || '0.1.1');
  const [pv1, pv2, pv3, pv4] = parseVersionNumbers(meta.ProductVersion || meta.FileVersion || '0.1.1');

  // Binary fixed info: always 4 integers
  vi.setFileVersion(v1, v2, v3, v4, 0);
  vi.setProductVersion(pv1, pv2, pv3, pv4, 0);

  // Clear previous/stale string tables so old language 0 strings don't override
  if (typeof vi.getAllLanguagesForStringValues === 'function' && typeof vi.removeAllStringValues === 'function') {
    const existingLangs = vi.getAllLanguagesForStringValues();
    for (const l of existingLangs) {
      try {
        vi.removeAllStringValues(l);
      } catch (e) {}
    }
  }

  const stringValues = {
    CompanyName: meta.CompanyName || '',
    FileDescription: meta.FileDescription || '',
    FileVersion: meta.FileVersion || `${v1}.${v2}.${v3}`,
    LegalCopyright: meta.LegalCopyright || '',
    ProductName: meta.ProductName || '',
    ProductVersion: meta.ProductVersion || `${pv1}.${pv2}.${pv3}`,
    OriginalFilename: meta.OriginalFilename || path.basename(exePath),
    InternalName: meta.InternalName || path.parse(exePath).name,
    LegalTrademarks: meta.LegalTrademarks || '',
    Comments: meta.Comments || ''
  };

  // Write exact metadata to both Language Neutral (0) and English US (1033)
  const targetLangs = [
    { lang: 0, codepage: 1200 },
    { lang: 1033, codepage: 1200 }
  ];

  for (const langObj of targetLangs) {
    vi.setStringValues(langObj, stringValues);
  }

  if (typeof vi.replaceAvailableLanguages === 'function') {
    vi.replaceAvailableLanguages(targetLangs);
  }

  vi.outputToResourceEntries(res.entries);

  // Icon replacement if supplied
  if (iconPath && fs.existsSync(iconPath)) {
    try {
      const iconData = fs.readFileSync(iconPath);
      const iconFile = ResEdit.Data.IconFile.from(iconData);
      ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        0,
        iconFile.icons.map(i => i.data)
      );
      ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        1033,
        iconFile.icons.map(i => i.data)
      );
    } catch (err) {
      console.warn('⚠️ Could not replace icon:', err.message);
    }
  }

  res.outputResource(exe);
  const newBinary = exe.generate();

  // Kill running instance if any
  const exeBase = path.basename(exePath);
  try {
    const { execSync } = require('child_process');
    execSync(`taskkill /F /IM "${exeBase}" 2>nul`, { stdio: 'ignore' });
  } catch (e) {}

  // Safe write with retry in case antivirus or explorer is briefly locking it
  let written = false;
  let lastErr = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.writeFileSync(exePath, Buffer.from(newBinary));
      written = true;
      break;
    } catch (err) {
      lastErr = err;
      if (err.code === 'EBUSY' || err.code === 'EPERM') {
        try {
          const { execSync } = require('child_process');
          execSync(`taskkill /F /IM "${exeBase}" 2>nul`, { stdio: 'ignore' });
        } catch (e) {}
        const waitTill = new Date(new Date().getTime() + 600);
        while (waitTill > new Date()) {}
      } else {
        throw err;
      }
    }
  }

  if (!written && lastErr) {
    throw lastErr;
  }
}

function syncProjectConfig(projectRoot, meta) {
  if (!projectRoot || !fs.existsSync(projectRoot)) return;
  const ver = (meta.ProductVersion || meta.FileVersion || '0.1.1').replace(/,0$/, '').replace(/\.0$/, '');

  function toSemVer(v) {
    const parts = v.split(/[\.\-]/).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    if (parts.length === 0) return '0.1.0';
    if (parts.length === 1) return `${parts[0]}.0.0`;
    if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  const semver = toSemVer(ver);

  // 1. package.json
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (meta.ProductName) pkg.name = meta.ProductName.toLowerCase().replace(/\s+/g, '-');
    pkg.version = semver;
    if (meta.FileDescription) pkg.description = meta.FileDescription;
    if (meta.CompanyName) pkg.author = meta.CompanyName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }

  // 2. tauri.conf.json
  const tauriPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
  if (fs.existsSync(tauriPath)) {
    const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
    if (meta.ProductName) tauri.productName = meta.ProductName;
    tauri.version = semver;
    if (!tauri.bundle) tauri.bundle = {};
    if (meta.LegalCopyright) tauri.bundle.copyright = meta.LegalCopyright;
    if (meta.FileDescription) tauri.bundle.shortDescription = meta.FileDescription;
    fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n', 'utf8');
  }

  // 3. Cargo.toml
  const cargoPath = path.join(projectRoot, 'src-tauri', 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    let cargo = fs.readFileSync(cargoPath, 'utf8');
    if (meta.FileDescription) {
      cargo = cargo.replace(/(description\s*=\s*)"[^"]+"/, `$1"${meta.FileDescription}"`);
    }
    if (meta.CompanyName) {
      cargo = cargo.replace(/(authors\s*=\s*)\[[^\]]+\]/, `$1["${meta.CompanyName}"]`);
    }
    cargo = cargo.replace(/(\[package\][\s\S]*?version\s*=\s*)"[^"]+"/, `$1"${semver}"`);
    fs.writeFileSync(cargoPath, cargo, 'utf8');
  }

  // 4. src/config.ts
  const configPath = path.join(projectRoot, 'src', 'config.ts');
  if (fs.existsSync(configPath)) {
    let cfg = fs.readFileSync(configPath, 'utf8');
    cfg = cfg.replace(/APP_VERSION\s*=\s*['"][^'"]+['"]/, `APP_VERSION = '${ver}'`);
    fs.writeFileSync(configPath, cfg, 'utf8');
  }

  // 5. Windows Shell MuiCache (Taskbar / Start Menu Display Name)
  try {
    const { execSync } = require('child_process');
    const out = execSync('reg query "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = out.split(/\r?\n/);
    const friendlyName = meta.ProductName || 'DigiManager';
    for (const line of lines) {
      const match = line.match(/^\s*(.*\.FriendlyAppName)\s+REG_SZ\s+(.*)$/i);
      if (match && match[1].toLowerCase().includes('digimanager')) {
        execSync(`reg add "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache" /v "${match[1].trim()}" /t REG_SZ /d "${friendlyName}" /f`, { stdio: 'ignore' });
      }
    }
  } catch (e) {}
}

async function main() {
  console.clear();
  console.log('================================================================');
  console.log('            DIGIMANAGER - PE METADATA & VERSION EDITOR          ');
  console.log('================================================================\n');

  let targetExe = process.argv[2] ? path.resolve(process.argv[2]) : null;
  const projectRoot = findProjectRoot(process.cwd());

  if (!targetExe || !fs.existsSync(targetExe)) {
    targetExe = await findDefaultExe(process.cwd());
  }

  if (!targetExe || !fs.existsSync(targetExe)) {
    console.log('⚠️  No compiled .exe file specified or found automatically.\n');
    const inputPath = await prompt('Enter full path to .exe file (or drag & drop here)');
    targetExe = inputPath.replace(/^["']|["']$/g, '').trim();
    if (!targetExe || !fs.existsSync(targetExe)) {
      console.error('\n❌ File not found:', targetExe);
      rl.close();
      return;
    }
  }

  let { meta } = await readExeMetadata(targetExe);
  let statusMessage = '';

  while (true) {
    console.clear();
    console.log('================================================================');
    console.log('            DIGIMANAGER - PE METADATA & VERSION EDITOR          ');
    console.log('================================================================\n');
    console.log(`📁 Target Executable: ${targetExe}\n`);

    if (statusMessage) {
      console.log(statusMessage);
      console.log('');
      statusMessage = '';
    }

    console.log('----------------------------------------------------------------');
    console.log(' CURRENT METADATA VALUES:');
    console.log('----------------------------------------------------------------');
    console.log(` [1] Product Name     : ${meta.ProductName}`);
    console.log(` [2] File Description : ${meta.FileDescription}`);
    console.log(` [3] Company / Author : ${meta.CompanyName}`);
    console.log(` [4] Legal Copyright  : ${meta.LegalCopyright}`);
    console.log(` [5] File Version     : ${meta.FileVersion}`);
    console.log(` [6] Product Version  : ${meta.ProductVersion}`);
    console.log(` [7] Original Filename: ${meta.OriginalFilename}`);
    if (meta._iconPath) {
      console.log(` [8] Custom Icon Path : ${meta._iconPath}`);
    }
    console.log('----------------------------------------------------------------');
    console.log(' ACTIONS:');
    console.log(' [A] Edit ALL fields step-by-step (Wizard)');
    console.log(' [1-7] Edit a specific field');
    console.log(' [I] Replace Executable Icon (.ico)');
    console.log(' [S] SAVE & INJECT into .exe (and sync project configs)');
    console.log(' [Q] Quit without saving');
    console.log('----------------------------------------------------------------');

    const choice = (await prompt('\nSelect an option [1-7, A, I, S, Q]', 'S')).toUpperCase();

    if (choice === 'Q') {
      console.clear();
      console.log('Exited without saving changes.');
      break;
    }

    if (choice === '1') {
      meta.ProductName = await prompt('Product Name', meta.ProductName);
      statusMessage = '✅ Updated Product Name to: ' + meta.ProductName;
    } else if (choice === '2') {
      meta.FileDescription = await prompt('File Description', meta.FileDescription);
      statusMessage = '✅ Updated File Description to: ' + meta.FileDescription;
    } else if (choice === '3') {
      meta.CompanyName = await prompt('Company / Author Name', meta.CompanyName);
      statusMessage = '✅ Updated Company Name to: ' + meta.CompanyName;
    } else if (choice === '4') {
      meta.LegalCopyright = await prompt('Legal Copyright', meta.LegalCopyright);
      statusMessage = '✅ Updated Legal Copyright to: ' + meta.LegalCopyright;
    } else if (choice === '5') {
      meta.FileVersion = await prompt('File Version (e.g. 0.1.1)', meta.FileVersion);
      statusMessage = '✅ Updated File Version to: ' + meta.FileVersion;
    } else if (choice === '6') {
      meta.ProductVersion = await prompt('Product Version (e.g. 0.1.1)', meta.ProductVersion);
      statusMessage = '✅ Updated Product Version to: ' + meta.ProductVersion;
    } else if (choice === '7') {
      meta.OriginalFilename = await prompt('Original Filename', meta.OriginalFilename);
      statusMessage = '✅ Updated Original Filename to: ' + meta.OriginalFilename;
    } else if (choice === 'A') {
      console.log('\n--- Step-by-Step Metadata Wizard ---');
      meta.ProductName = await prompt('Product Name', meta.ProductName);
      meta.FileDescription = await prompt('File Description', meta.FileDescription);
      meta.CompanyName = await prompt('Company / Author Name', meta.CompanyName);
      meta.LegalCopyright = await prompt('Legal Copyright', meta.LegalCopyright);
      meta.FileVersion = await prompt('File Version', meta.FileVersion);
      meta.ProductVersion = await prompt('Product Version', meta.ProductVersion);
      meta.OriginalFilename = await prompt('Original Filename', meta.OriginalFilename);
      statusMessage = '✅ Wizard completed! All fields updated.';
    } else if (choice === 'I') {
      const defaultIcon = projectRoot ? path.join(projectRoot, 'icon.ico') : '';
      const iconInput = await prompt('Path to .ico file', fs.existsSync(defaultIcon) ? defaultIcon : '');
      const cleanIcon = iconInput.replace(/^["']|["']$/g, '').trim();
      if (fs.existsSync(cleanIcon)) {
        meta._iconPath = cleanIcon;
        statusMessage = `✅ Icon selected: ${cleanIcon}`;
      } else {
        statusMessage = `❌ Icon file not found: ${cleanIcon}`;
      }
    } else if (choice === 'S') {
      console.clear();
      console.log('================================================================');
      console.log('               SAVING AND INJECTING METADATA                    ');
      console.log('================================================================\n');
      console.log('⏳ Injecting metadata into executable...');
      try {
        await writeExeMetadata(targetExe, meta, meta._iconPath || null);
        console.log('✅ Successfully stamped metadata into:\n   ' + targetExe);

        if (projectRoot) {
          console.log('\n⏳ Syncing metadata with project configs (tauri.conf.json, Cargo.toml, package.json)...');
          syncProjectConfig(projectRoot, meta);
          console.log('✅ Project configs synced!');
        }

        console.log('\n================================================================');
        console.log('                     METADATA UPDATE COMPLETE!                 ');
        console.log('================================================================\n');
      } catch (err) {
        console.error('❌ Error updating metadata:', err);
      }
      break;
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  rl.close();
});
