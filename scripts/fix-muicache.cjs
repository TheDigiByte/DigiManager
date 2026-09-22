const { execSync } = require('child_process');

try {
  const queryCmd = 'reg query "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache"';
  const out = execSync(queryCmd, { encoding: 'utf8' });
  const lines = out.split(/\r?\n/);
  
  let updatedCount = 0;
  for (const line of lines) {
    const match = line.match(/^\s*(.*\.FriendlyAppName)\s+REG_SZ\s+(.*)$/i);
    if (match) {
      const prop = match[1].trim();
      if (prop.toLowerCase().includes('digimanager')) {
        console.log(`[MuiCache] Found: "${prop}" => currently "${match[2].trim()}"`);
        const addCmd = `reg add "HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache" /v "${prop}" /t REG_SZ /d "DigiManager" /f`;
        execSync(addCmd, { stdio: 'ignore' });
        console.log(`[MuiCache] -> Successfully updated to "DigiManager"`);
        updatedCount++;
      }
    }
  }

  console.log(`[MuiCache] Done! Updated ${updatedCount} registry cache entries.`);
} catch (err) {
  console.error('[MuiCache] Error:', err.message);
}
