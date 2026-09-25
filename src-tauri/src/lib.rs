// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::sync::Mutex;
use std::io::Read;
use tauri::Emitter;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};

fn create_command(program: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd
}

fn is_steam_running() -> bool {
    if cfg!(target_os = "windows") {
        let output = create_command("tasklist")
            .args(&["/FI", "IMAGENAME eq steam.exe", "/NH"])
            .output();
        if let Ok(out) = output {
            let s = String::from_utf8_lossy(&out.stdout);
            s.to_lowercase().contains("steam.exe")
        } else {
            false
        }
    } else {
        false
    }
}

fn is_steam_process_active() -> bool {
    if cfg!(target_os = "windows") {
        let output = create_command("tasklist")
            .args(&["/FI", "IMAGENAME eq steam*", "/NH"])
            .output();
        if let Ok(out) = output {
            let s = String::from_utf8_lossy(&out.stdout).to_lowercase();
            s.contains("steam.exe") || s.contains("steamwebhelper.exe")
        } else {
            false
        }
    } else {
        false
    }
}

fn kill_steam_thoroughly() {
    if cfg!(target_os = "windows") {
        let procs = ["steam.exe", "steamwebhelper.exe", "gameoverlayui.exe", "steamerrorreporter.exe"];
        for proc_name in &procs {
            let _ = create_command("taskkill")
                .args(&["/F", "/T", "/IM", proc_name])
                .output();
        }

        // Wait in loop until Steam and helper processes are actually terminated (up to 3.5s)
        for _ in 0..10 {
            if !is_steam_process_active() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(300));
        }

        // Additional buffer for Windows OS kernel to completely release file handles on DLLs
        std::thread::sleep(std::time::Duration::from_millis(600));
    }
}

struct ActiveProcessState {
    child: Mutex<Option<std::process::Child>>,
}

#[derive(serde::Serialize, Clone)]
struct ProgressPayload {
    status: String,
    progress: i32,
    message: String,
}

#[derive(serde::Deserialize, serde::Serialize, Clone)]
struct ExtraFilePatch {
    download_url: String,
    target_path: String,
}

fn get_steam_registry_values() -> Option<(String, String)> {
    if cfg!(target_os = "windows") {
        let output = create_command("reg")
            .args(&["query", "HKCU\\Software\\Valve\\Steam"])
            .output();
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let mut steam_path = String::new();
            let mut auto_login_user = String::new();
            for line in stdout.lines() {
                if line.contains("SteamPath") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        steam_path = parts[2..].join(" ").replace("/", "\\");
                    }
                } else if line.contains("AutoLoginUser") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        auto_login_user = parts[2..].join(" ");
                    }
                }
            }
            if !steam_path.is_empty() {
                if let Ok(canonical) = std::fs::canonicalize(&steam_path) {
                    let s = canonical.to_string_lossy().to_string();
                    steam_path = s.strip_prefix(r"\\?\").unwrap_or(&s).to_string();
                }
                return Some((steam_path, auto_login_user));
            }
        }
    }
    None
}

#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_steam_user() -> String {
    if let Some((_, user)) = get_steam_registry_values() {
        if !user.is_empty() {
            return user;
        }
    }
    "Unknown".to_string()
}

fn get_steam_profile_display_name() -> Option<String> {
    if cfg!(target_os = "windows") {
        let output = create_command("reg")
            .args(&["query", "HKCU\\Software\\Valve\\Steam"])
            .output();
        if let Ok(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let mut last_game_name = String::new();
            let mut persona_name = String::new();
            let mut auto_login = String::new();
            for line in stdout.lines() {
                if line.contains("LastGameNameUsed") {
                    if let Some(pos) = line.find("REG_SZ") {
                        let val = line[pos + 6..].trim().to_string();
                        if !val.is_empty() {
                            last_game_name = val;
                        }
                    }
                } else if line.contains("PersonaName") {
                    if let Some(pos) = line.find("REG_SZ") {
                        let val = line[pos + 6..].trim().to_string();
                        if !val.is_empty() {
                            persona_name = val;
                        }
                    }
                } else if line.contains("AutoLoginUser") {
                    if let Some(pos) = line.find("REG_SZ") {
                        let val = line[pos + 6..].trim().to_string();
                        if !val.is_empty() {
                            auto_login = val;
                        }
                    }
                }
            }
            if !last_game_name.is_empty() {
                return Some(last_game_name);
            }
            if !persona_name.is_empty() {
                return Some(persona_name);
            }
            if !auto_login.is_empty() {
                return Some(auto_login);
            }
        }
    }
    None
}

#[tauri::command]
fn get_steam_profile_name() -> String {
    get_steam_profile_display_name().unwrap_or_else(|| "Unknown".to_string())
}

#[tauri::command]
fn get_steam_path() -> String {
    if let Some((path, _)) = get_steam_registry_values() {
        if !path.is_empty() {
            return path;
        }
    }
    "Not Found".to_string()
}

#[tauri::command]
fn get_autostart_status() -> bool {
    #[cfg(target_os = "windows")]
    {
        let output = create_command("reg")
            .args(&["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "DigiManager"])
            .output();
        if let Ok(out) = output {
            return out.status.success();
        }
    }
    false
}

#[tauri::command]
fn set_autostart_status(enabled: bool) -> bool {
    #[cfg(target_os = "windows")]
    {
        if enabled {
            if let Ok(current_exe) = std::env::current_exe() {
                let exe_str = current_exe.to_string_lossy().to_string();
                let reg_val = format!("\"{}\" --minimized", exe_str);
                let output = create_command("reg")
                    .args(&[
                        "add",
                        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                        "/v",
                        "DigiManager",
                        "/t",
                        "REG_SZ",
                        "/d",
                        &reg_val,
                        "/f",
                    ])
                    .output();
                return output.map(|o| o.status.success()).unwrap_or(false);
            }
        } else {
            let output = create_command("reg")
                .args(&[
                    "delete",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "DigiManager",
                    "/f",
                ])
                .output();
            return output.map(|o| o.status.success()).unwrap_or(false);
        }
    }
    false
}

#[tauri::command]
async fn pick_folder() -> Option<String> {
    tauri::async_runtime::spawn_blocking(|| {
        let folder = rfd::FileDialog::new()
            .set_title("เลือกโฟลเดอร์ติดตั้ง Steam")
            .pick_folder();
            
        if let Some(path) = folder {
            if let Ok(canonical) = std::fs::canonicalize(&path) {
                let s = canonical.to_string_lossy().to_string();
                Some(s.strip_prefix(r"\\?\").unwrap_or(&s).to_string())
            } else {
                Some(path.to_string_lossy().to_string())
            }
        } else {
            None
        }
    }).await.unwrap_or(None)
}

fn get_diby_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    if let Ok(appdata) = app.path().data_dir() {
        appdata.join("diby")
    } else {
        let appdata_user = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string());
        std::path::PathBuf::from(format!(r"C:\Users\{}\AppData\Roaming\diby", appdata_user))
    }
}

#[tauri::command]
fn get_diby_path(app: tauri::AppHandle) -> String {
    get_diby_dir(&app).to_string_lossy().to_string()
}

#[tauri::command]
fn check_lua_file(app: tauri::AppHandle, game_id: String) -> bool {
    let target_path = get_diby_dir(&app).join(format!("{}.lua", game_id));
    target_path.exists()
}

#[tauri::command]
fn check_lua_files(app: tauri::AppHandle, game_ids: Vec<String>) -> std::collections::HashMap<String, bool> {
    let target_dir = get_diby_dir(&app);
    let mut map = std::collections::HashMap::new();
    for game_id in game_ids {
        let target_path = target_dir.join(format!("{}.lua", game_id));
        map.insert(game_id, target_path.exists());
    }
    map
}

#[tauri::command]
fn write_lua_file(app: tauri::AppHandle, game_id: String, content: String) -> bool {
    let target_dir = get_diby_dir(&app);
    let target_path = target_dir.join(format!("{}.lua", game_id));
    
    // Ensure target_dir exists
    let _ = std::fs::create_dir_all(&target_dir);
    
    std::fs::write(&target_path, &content).is_ok()
}

#[tauri::command]
fn delete_lua_file(app: tauri::AppHandle, game_id: String) -> bool {
    let target_path = get_diby_dir(&app).join(format!("{}.lua", game_id));
    if target_path.exists() {
        std::fs::remove_file(&target_path).is_ok()
    } else {
        false
    }
}

#[tauri::command]
fn read_lua_file(app: tauri::AppHandle, game_id: String) -> String {
    let target_path = get_diby_dir(&app).join(format!("{}.lua", game_id));
    std::fs::read_to_string(&target_path).unwrap_or_default()
}

fn get_steam_depotcache_dir() -> Result<std::path::PathBuf, String> {
    let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
    if let Some((path, _)) = get_steam_registry_values() {
        if !path.is_empty() {
            steam_path = path;
        }
    }
    let depotcache = std::path::PathBuf::from(steam_path).join("depotcache");
    if !depotcache.exists() {
        std::fs::create_dir_all(&depotcache).map_err(|e| format!("Failed to create depotcache directory: {}", e))?;
    }
    Ok(depotcache)
}

#[tauri::command]
fn get_depotcache_path() -> String {
    get_steam_depotcache_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "".to_string())
}

#[tauri::command]
fn write_manifest_file(filename: String, bytes: Vec<u8>) -> Result<bool, String> {
    let clean_name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Invalid filename".to_string())?;

    if !clean_name.ends_with(".manifest") {
        return Err("Only .manifest files are allowed".to_string());
    }

    let depotcache = get_steam_depotcache_dir()?;
    let target_path = depotcache.join(clean_name);

    std::fs::write(&target_path, &bytes)
        .map_err(|e| format!("Failed to write manifest file {}: {}", clean_name, e))?;

    Ok(true)
}

#[tauri::command]
fn extract_manifest_zip(bytes: Vec<u8>) -> Result<usize, String> {
    let depotcache = get_steam_depotcache_dir()?;
    let reader = std::io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(reader).map_err(|e| format!("Failed to open manifest zip: {}", e))?;
    let mut count = 0;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| format!("Zip entry error at index {}: {}", i, e))?;
        let raw_name = file.name().to_string();
        if raw_name.ends_with('/') {
            continue;
        }
        let clean_name = std::path::Path::new(&raw_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(&raw_name);

        if clean_name.to_lowercase().ends_with(".manifest") {
            let target_path = depotcache.join(clean_name);
            let mut outfile = std::fs::File::create(&target_path)
                .map_err(|e| format!("Failed to create manifest file {}: {}", clean_name, e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to write manifest file {}: {}", clean_name, e))?;
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
async fn download_and_extract_manifest_zip(url: String, fallback_url: Option<String>) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(180))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let download_bytes = |target_url: &str| -> Result<Vec<u8>, String> {
            let resp = client.get(target_url)
                .header("User-Agent", "DigiManager/0.1.6 (Windows NT 10.0; Win64; x64)")
                .header("Accept", "*/*")
                .header("ngrok-skip-browser-warning", "true")
                .send()
                .map_err(|e| format!("Download request error for {}: {}", target_url, e))?;

            if !resp.status().is_success() {
                return Err(format!("Download failed with status: {} ({})", resp.status(), target_url));
            }

            let bytes = resp.bytes().map_err(|e| format!("Failed to read data from {}: {}", target_url, e))?;
            if bytes.is_empty() {
                return Err(format!("Downloaded package from {} is empty", target_url));
            }
            Ok(bytes.to_vec())
        };

        let bytes = match download_bytes(&url) {
            Ok(b) => b,
            Err(primary_err) => {
                if let Some(ref fb) = fallback_url {
                    let trimmed_fb = fb.trim();
                    if !trimmed_fb.is_empty() && trimmed_fb != &url {
                        eprintln!("Primary manifest URL failed ({}), falling back to {}", primary_err, trimmed_fb);
                        download_bytes(trimmed_fb)
                            .map_err(|fb_err| format!("Primary failed: {}; Fallback failed: {}", primary_err, fb_err))?
                    } else {
                        return Err(primary_err);
                    }
                } else {
                    return Err(primary_err);
                }
            }
        };

        extract_manifest_zip(bytes)
    }).await.map_err(|e| format!("Task execution error: {}", e))?
}

#[tauri::command]
fn check_manifest_files(filenames: Vec<String>) -> std::collections::HashMap<String, bool> {
    let mut result = std::collections::HashMap::new();
    if let Ok(depotcache) = get_steam_depotcache_dir() {
        for filename in filenames {
            let clean_name = std::path::Path::new(&filename)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(&filename);
            let target_path = depotcache.join(clean_name);
            result.insert(filename, target_path.exists());
        }
    } else {
        for filename in filenames {
            result.insert(filename, false);
        }
    }
    result
}

#[tauri::command]
fn open_depotcache_folder() -> Result<bool, String> {
    let depotcache = get_steam_depotcache_dir()?;
    open_folder_in_explorer(depotcache.to_string_lossy().to_string());
    Ok(true)
}

#[tauri::command]
async fn restart_steam() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
        if let Some((path, _)) = get_steam_registry_values() {
            if !path.is_empty() {
                steam_path = path;
            }
        }
        let steam_exe = std::path::PathBuf::from(&steam_path).join("steam.exe");

        // 1. If Steam is running, terminate it thoroughly
        if is_steam_running() {
            #[cfg(target_os = "windows")]
            {
                kill_steam_thoroughly();
            }
        }

        // 2. Start Steam
        #[cfg(target_os = "windows")]
        {
            if steam_exe.exists() {
                let _ = std::process::Command::new(&steam_exe).spawn();
            } else {
                let _ = std::process::Command::new("cmd")
                    .args(&["/C", "start", "steam://"])
                    .spawn();
            }
        }

        Ok(true)
    }).await.unwrap_or(Ok(false))
}

#[derive(serde::Serialize, Clone, Debug)]
struct ClearGameCacheResult {
    acf_deleted: bool,
    acf_paths: Vec<String>,
    downloading_deleted: bool,
    manifests_deleted_count: usize,
    deleted_manifests: Vec<String>,
    depots_detected: Vec<String>,
}

#[tauri::command]
async fn clear_game_cache(
    app: tauri::AppHandle,
    game_id: String,
    extra_depot_ids: Vec<String>,
) -> Result<ClearGameCacheResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let clean_game_id = game_id.trim();
        if clean_game_id.is_empty() {
            return Err("Game ID cannot be empty".to_string());
        }

        let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
        if let Some((path, _)) = get_steam_registry_values() {
            if !path.is_empty() {
                steam_path = path;
            }
        }

        // 1. Gather all steam library paths
        let library_vdf_path = format!("{}\\steamapps\\libraryfolders.vdf", steam_path);
        let mut library_paths = vec![steam_path.clone()];

        if let Ok(content) = std::fs::read_to_string(&library_vdf_path) {
            for line in content.lines() {
                if line.contains("\"path\"") {
                    let parts: Vec<&str> = line.split('"').collect();
                    if parts.len() >= 4 {
                        let path = parts[3].replace("\\\\", "\\");
                        if !path.trim().is_empty() {
                            library_paths.push(path.trim().to_string());
                        }
                    }
                }
            }
        }
        library_paths.sort();
        library_paths.dedup();

        let mut depots_set: std::collections::HashSet<String> = std::collections::HashSet::new();

        // Include extra depot IDs passed from caller
        for did in extra_depot_ids {
            let d = did.trim().to_string();
            if !d.is_empty() && d.chars().all(|c| c.is_digit(10)) {
                depots_set.insert(d);
            }
        }

        // 2. Scan and parse appmanifest_<game_id>.acf in each library before deleting
        let mut acf_paths_deleted = Vec::new();
        let mut downloading_deleted = false;

        for lib in &library_paths {
            let manifest_path = std::path::PathBuf::from(lib).join("steamapps").join(format!("appmanifest_{}.acf", clean_game_id));
            if manifest_path.exists() {
                // Read and extract InstalledDepots
                if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                    let mut in_depots = false;
                    for line in content.lines() {
                        let trimmed = line.trim();
                        if trimmed.starts_with("\"InstalledDepots\"") {
                            in_depots = true;
                            continue;
                        }
                        if in_depots {
                            if trimmed == "}" {
                                in_depots = false;
                            } else if trimmed.starts_with('"') {
                                let parts: Vec<&str> = trimmed.split('"').collect();
                                if parts.len() >= 2 {
                                    let candidate = parts[1].trim();
                                    if candidate.chars().all(|c| c.is_digit(10)) && !candidate.is_empty() {
                                        depots_set.insert(candidate.to_string());
                                    }
                                }
                            }
                        }
                    }
                }

                if std::fs::remove_file(&manifest_path).is_ok() {
                    acf_paths_deleted.push(manifest_path.to_string_lossy().to_string());
                }
            }

            // Check downloading folder
            let downloading_path = std::path::PathBuf::from(lib).join("steamapps").join("downloading").join(clean_game_id);
            if downloading_path.exists() {
                if std::fs::remove_dir_all(&downloading_path).is_ok() {
                    downloading_deleted = true;
                }
            }
        }

        // 3. Extract depot IDs from local .lua file in diby
        let target_dir = get_diby_dir(&app);
        let target_lua = target_dir.join(format!("{}.lua", clean_game_id));
        if target_lua.exists() {
            if let Ok(content) = std::fs::read_to_string(&target_lua) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("addappid") || trimmed.starts_with("setManifestid") || trimmed.starts_with("-- setManifestid") || trimmed.starts_with("--setManifestid") {
                        if let Some(start) = trimmed.find('(') {
                            let rest = &trimmed[start + 1..];
                            let candidate: String = rest.chars().take_while(|c| c.is_digit(10)).collect();
                            if !candidate.is_empty() && candidate != clean_game_id {
                                depots_set.insert(candidate);
                            }
                        }
                    }
                }
            }
        }

        // 4. Also check Steam/config/stplug-in/<clean_game_id>.lua if it exists
        let stplug_lua = std::path::PathBuf::from(&steam_path).join("config").join("stplug-in").join(format!("{}.lua", clean_game_id));
        if stplug_lua.exists() {
            if let Ok(content) = std::fs::read_to_string(&stplug_lua) {
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("addappid") || trimmed.starts_with("setManifestid") || trimmed.starts_with("-- setManifestid") || trimmed.starts_with("--setManifestid") {
                        if let Some(start) = trimmed.find('(') {
                            let rest = &trimmed[start + 1..];
                            let candidate: String = rest.chars().take_while(|c| c.is_digit(10)).collect();
                            if !candidate.is_empty() && candidate != clean_game_id {
                                depots_set.insert(candidate);
                            }
                        }
                    }
                }
            }
        }

        // Always also check clean_game_id itself
        depots_set.insert(clean_game_id.to_string());

        // 5. Delete matching manifest files in depotcache
        let mut deleted_manifests = Vec::new();
        if let Ok(depotcache) = get_steam_depotcache_dir() {
            if depotcache.exists() {
                if let Ok(entries) = std::fs::read_dir(&depotcache) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            if let Some(fname) = path.file_name().and_then(|n| n.to_str()) {
                                if fname.ends_with(".manifest") {
                                    if let Some(underscore_idx) = fname.find('_') {
                                        let depot_prefix = &fname[..underscore_idx];
                                        if depots_set.contains(depot_prefix) {
                                            if std::fs::remove_file(&path).is_ok() {
                                                deleted_manifests.push(fname.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut depots_vec: Vec<String> = depots_set.into_iter().collect();
        depots_vec.sort();

        Ok(ClearGameCacheResult {
            acf_deleted: !acf_paths_deleted.is_empty(),
            acf_paths: acf_paths_deleted,
            downloading_deleted,
            manifests_deleted_count: deleted_manifests.len(),
            deleted_manifests,
            depots_detected: depots_vec,
        })
    }).await.map_err(|e| format!("Task failed: {}", e))?
}

fn query_install_location(registry_key: &str) -> Option<String> {
    let output = create_command("reg")
        .args(&["query", registry_key, "/v", "InstallLocation"])
        .output();
    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            if line.contains("InstallLocation") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let path = parts[2..].join(" ");
                    if !path.trim().is_empty() {
                        return Some(path.trim().to_string());
                    }
                }
            }
        }
    }
    None
}

fn get_game_install_path(game_id: &str, game_folder: &str) -> Option<String> {
    let key1 = format!("HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App {}", game_id);
    if let Some(path) = query_install_location(&key1) {
        if std::path::Path::new(&path).exists() {
            return Some(path);
        }
    }
    
    let key2 = format!("HKLM\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App {}", game_id);
    if let Some(path) = query_install_location(&key2) {
        if std::path::Path::new(&path).exists() {
            return Some(path);
        }
    }

    let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
    if let Some((path, _)) = get_steam_registry_values() {
        if !path.is_empty() {
            steam_path = path;
        }
    }

    let library_vdf_path = format!("{}\\steamapps\\libraryfolders.vdf", steam_path);
    let mut library_paths = vec![steam_path.clone()];

    if let Ok(content) = std::fs::read_to_string(&library_vdf_path) {
        for line in content.lines() {
            if line.contains("\"path\"") {
                let parts: Vec<&str> = line.split('"').collect();
                if parts.len() >= 4 {
                    let path = parts[3].replace("\\\\", "\\");
                    if !path.trim().is_empty() {
                        library_paths.push(path.trim().to_string());
                    }
                }
            }
        }
    }

    // 1. Try finding by matching game_folder name in steamapps/common/
    if !game_folder.is_empty() {
        for lib in &library_paths {
            let final_path = format!("{}\\steamapps\\common\\{}", lib, game_folder);
            if std::path::Path::new(&final_path).exists() {
                return Some(final_path);
            }
        }
    }

    // 2. Fallback: Check each library path for appmanifest_<game_id>.acf
    for lib in library_paths {
        let manifest_path = format!("{}\\steamapps\\appmanifest_{}.acf", lib, game_id);
        if std::path::Path::new(&manifest_path).exists() {
            if let Ok(manifest_content) = std::fs::read_to_string(&manifest_path) {
                for line in manifest_content.lines() {
                    if line.contains("\"installdir\"") {
                        let parts: Vec<&str> = line.split('"').collect();
                        if parts.len() >= 4 {
                            let installdir = parts[3];
                            let final_path = format!("{}\\steamapps\\common\\{}", lib, installdir);
                            if std::path::Path::new(&final_path).exists() {
                                return Some(final_path);
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

#[tauri::command]
fn create_desktop_shortcut(game_id: String, exe_filename: String, title: String) -> bool {
    if let Some(install_path) = get_game_install_path(&game_id, "") {
        let target_exe = format!("{}\\{}", install_path, exe_filename);
        if std::path::Path::new(&target_exe).exists() {
            let clean_title = title.replace(|c: char| !c.is_alphanumeric() && c != ' ', "");
            let ps_script = format!(
                "$WshShell = New-Object -ComObject WScript.Shell; \
                 $Shortcut = $WshShell.CreateShortcut(\"$Home\\Desktop\\{}.lnk\"); \
                 $Shortcut.TargetPath = '{}'; \
                 $Shortcut.WorkingDirectory = '{}'; \
                 $Shortcut.Save()",
                clean_title, target_exe, install_path
            );
            
            let output = create_command("powershell")
                .args(&["-NoProfile", "-Command", &ps_script])
                .output();
            
            if let Ok(out) = output {
                return out.status.success();
            }
        }
    }
    false
}

#[tauri::command]
fn cancel_patch(state: tauri::State<'_, ActiveProcessState>) -> bool {
    let mut lock = state.child.lock().unwrap();
    if let Some(mut child) = lock.take() {
        let _ = child.kill();
        true
    } else {
        false
    }
}

fn copy_file_with_retry(src: &std::path::Path, dst: &std::path::Path, max_retries: u32, delay_ms: u64) -> std::io::Result<u64> {
    let mut last_err = None;
    for attempt in 0..=max_retries {
        match std::fs::copy(src, dst) {
            Ok(bytes) => return Ok(bytes),
            Err(e) => {
                last_err = Some(e);
                if attempt < max_retries {
                    // Try to clear read-only flag if destination file exists
                    if let Ok(metadata) = std::fs::metadata(dst) {
                        let mut permissions = metadata.permissions();
                        #[allow(clippy::permissions_set_readonly_false)]
                        permissions.set_readonly(false);
                        let _ = std::fs::set_permissions(dst, permissions);
                    }
                    std::thread::sleep(std::time::Duration::from_millis(delay_ms));
                }
            }
        }
    }
    Err(last_err.unwrap())
}

fn copy_dir_all(src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let target_path = dst.as_ref().join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(entry.path(), target_path)?;
        } else {
            // Attempt copy with retry (up to 6 attempts, 500ms delay) to handle any temporary Windows file locks
            copy_file_with_retry(&entry.path(), &target_path, 6, 500)?;
        }
    }
    Ok(())
}

fn expand_env_vars(path: &str) -> String {
    let mut expanded = path.to_string();
    let mut start = 0;
    while let Some(pos) = expanded[start..].find('%') {
        let actual_pos = start + pos;
        if let Some(end_pos) = expanded[actual_pos + 1..].find('%') {
            let actual_end = actual_pos + 1 + end_pos;
            let var_name = &expanded[actual_pos + 1..actual_end];
            if let Ok(val) = std::env::var(var_name) {
                expanded.replace_range(actual_pos..=actual_end, &val);
                start = actual_pos + val.len();
            } else {
                start = actual_end + 1;
            }
        } else {
            break;
        }
    }
    expanded
}

fn download_with_progress<F>(url: &str, mut on_progress: F) -> Result<Vec<u8>, String>
where
    F: FnMut(i32),
{
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(90))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
    let mut response = client.get(url)
        .header("User-Agent", "DigiManager-Agent")
        .send()
        .map_err(|e| format!("Failed to send download request: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("Download failed with status code: {}", response.status()));
    }
    
    let total_size = response.content_length().unwrap_or(0);
    let mut buffer = Vec::new();
    let mut temp_buf = [0; 65536];
    let mut downloaded = 0;
    
    loop {
        let limit = response.read(&mut temp_buf)
            .map_err(|e| format!("Failed to read download stream: {}", e))?;
        if limit == 0 {
            break;
        }
        buffer.extend_from_slice(&temp_buf[..limit]);
        downloaded += limit as u64;
        if total_size > 0 {
            let pct = ((downloaded as f64 / total_size as f64) * 100.0) as i32;
            on_progress(pct);
        }
    }
    
    if buffer.is_empty() {
        return Err("ดาวน์โหลดไม่สำเร็จ หรือไฟล์ที่ได้รับมีขนาด 0 Bytes (ลิงก์อาจหมดอายุ ถูกบล็อก หรือถูกแอนตี้ไวรัสลบ)".to_string());
    }
    
    Ok(buffer)
}

fn extract_zip(zip_bytes: &[u8], dest_dir: &std::path::Path) -> Result<(), String> {
    if zip_bytes.is_empty() {
        return Err("ไฟล์ Patch มีขนาด 0 Bytes ไม่สามารถแตกไฟล์ได้ (กรุณาตรวจสอบลิงก์ดาวน์โหลด)".to_string());
    }
    let reader = std::io::Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(reader)
        .map_err(|e| format!("Failed to parse zip archive: {}", e))?;
        
    std::fs::create_dir_all(dest_dir)
        .map_err(|e| format!("Failed to create destination folder: {}", e))?;
        
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read zip item: {}", e))?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest_dir.join(path),
            None => continue,
        };
        
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create subfolder: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p)
                        .map_err(|e| format!("Failed to create parent subfolder: {}", e))?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create extracted file: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to write extracted file: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn install_patch(
    window: tauri::Window,
    game_id: String,
    download_url: String,
    game_folder: String,
    exe_filename: String,
    title: String,
    create_shortcut: bool,
    extra_files: Option<Vec<ExtraFilePatch>>,
    profile_sync_enabled: Option<bool>,
    profile_sync_file: Option<String>,
    profile_sync_key: Option<String>,
) -> Result<String, String> {
    let install_path = match get_game_install_path(&game_id, &game_folder) {
        Some(path) => path,
        None => return Err(format!("ไม่พบโฟลเดอร์ติดตั้งของเกม [{}] กรุณาติดตั้งเกมจาก Steam ก่อนทำการติดตั้ง Patch", title)),
    };

    let _ = window.emit("patch-progress", ProgressPayload {
        status: "preparing".to_string(),
        progress: 0,
        message: "กำลังเตรียมไฟล์...".to_string(),
    });

    let window_clone = window.clone();
    let download_url_clone = download_url.clone();
    let game_id_clone = game_id.clone();
    let install_path_clone = install_path.clone();

    // 1. Download & Extract main patch (if not empty)
    if !download_url_clone.is_empty() {
        let res = tauri::async_runtime::spawn_blocking(move || {
            let bytes = download_with_progress(&download_url_clone, |pct| {
                let _ = window_clone.emit("patch-progress", ProgressPayload {
                    status: "downloading".to_string(),
                    progress: pct,
                    message: format!("กำลังดาวน์โหลดไฟล์... {}%", pct),
                });
            })?;

            let _ = window_clone.emit("patch-progress", ProgressPayload {
                status: "extracting".to_string(),
                progress: 100,
                message: "กำลังแตกไฟล์ Patch...".to_string(),
            });

            let temp_dir = std::env::temp_dir().join(format!("DigiManagerPatch_{}", game_id_clone));
            let extract_dir = temp_dir.join("extracted");
            extract_zip(&bytes, &extract_dir)?;

            let _ = window_clone.emit("patch-progress", ProgressPayload {
                status: "copying".to_string(),
                progress: 100,
                message: "กำลังติดตั้งตัว Patch ลงในเครื่อง...".to_string(),
            });

            if let Err(e) = copy_dir_all(&extract_dir, &install_path_clone) {
                let _ = std::fs::remove_dir_all(&temp_dir);
                return Err(if e.kind() == std::io::ErrorKind::PermissionDenied {
                    "การติดตั้งล้มเหลว: ถูกปฏิเสธการเข้าถึงโฟลเดอร์ (กรุณาอนุญาตแอปใน Windows Defender หรือรันโปรแกรมด้วยสิทธิ์ Administrator)".to_string()
                } else {
                    format!("ไม่สามารถคัดลอกไฟล์ Patch ได้: {}", e)
                });
            }
            let _ = std::fs::remove_dir_all(&temp_dir);
            Ok(())
        }).await.map_err(|e| format!("Task failed: {}", e))?;
        res?;
    }

    // 2. Extra Files
    if let Some(files) = extra_files {
        for (idx, file) in files.iter().enumerate() {
            let window_clone = window.clone();
            let file_url = file.download_url.clone();
            let target_path_str = file.target_path.clone();
            let game_id_clone = game_id.clone();
            
            let res = tauri::async_runtime::spawn_blocking(move || {
                let _ = window_clone.emit("patch-progress", ProgressPayload {
                    status: "extra_downloading".to_string(),
                    progress: (idx + 1) as i32,
                    message: format!("กำลังเตรียมดาวน์โหลดและแตกไฟล์เพิ่มเติม ชิ้นที่ {}...", idx + 1),
                });

                let bytes = download_with_progress(&file_url, |pct| {
                    let _ = window_clone.emit("patch-progress", ProgressPayload {
                        status: "downloading".to_string(),
                        progress: pct,
                        message: format!("กำลังดาวน์โหลดไฟล์ชิ้นที่ {}... {}%", idx + 1, pct),
                    });
                })?;

                let expanded_target = expand_env_vars(&target_path_str);
                let temp_dir = std::env::temp_dir().join(format!("DigiManagerExtra_{}_{}", game_id_clone, idx));
                let extract_dir = temp_dir.join("extracted");
                extract_zip(&bytes, &extract_dir)?;

                let _ = window_clone.emit("patch-progress", ProgressPayload {
                    status: "copying_extra".to_string(),
                    progress: 100,
                    message: format!("กำลังติดตั้งไฟล์เพิ่มเติม ชิ้นที่ {}...", idx + 1),
                });

                if let Err(e) = copy_dir_all(&extract_dir, &expanded_target) {
                    let _ = std::fs::remove_dir_all(&temp_dir);
                    return Err(if e.kind() == std::io::ErrorKind::PermissionDenied {
                        "การติดตั้งล้มเหลว: ถูกปฏิเสธการเข้าถึงโฟลเดอร์ (กรุณาอนุญาตแอปใน Windows Defender หรือรันโปรแกรมด้วยสิทธิ์ Administrator)".to_string()
                    } else {
                        format!("ไม่สามารถคัดลอกไฟล์เพิ่มเติม ชิ้นที่ {} ได้: {}", idx + 1, e)
                    });
                }
                let _ = std::fs::remove_dir_all(&temp_dir);
                Ok(())
            }).await.map_err(|e| format!("Task failed: {}", e))?;
            res?;
        }
    }

    // 3. Steam Profile Name Sync (if enabled)
    if profile_sync_enabled.unwrap_or(false) {
        if let Some(ref rel_file) = profile_sync_file {
            let clean_rel = rel_file.trim().replace("/", "\\");
            let clean_rel = clean_rel.trim_start_matches('\\');
            if !clean_rel.is_empty() {
                let target_file_path = std::path::Path::new(&install_path).join(clean_rel);
                if let Some(profile_name) = get_steam_profile_display_name() {
                    let _ = window.emit("patch-progress", ProgressPayload {
                        status: "syncing_profile".to_string(),
                        progress: 99,
                        message: format!("กำลังซิงค์ชื่อโปรไฟล์ Steam [{}]...", profile_name),
                    });

                    let sync_key = profile_sync_key.as_deref().unwrap_or("").trim();
                    if !sync_key.is_empty() {
                        let mut lines: Vec<String> = Vec::new();
                        let mut replaced = false;

                        if target_file_path.exists() {
                            if let Ok(bytes) = std::fs::read(&target_file_path) {
                                let content = String::from_utf8_lossy(&bytes);
                                for line in content.lines() {
                                    let trimmed = line.trim_start();
                                    if let Some(eq_pos) = trimmed.find('=') {
                                        let current_key = trimmed[..eq_pos].trim();
                                        let current_val = trimmed[eq_pos + 1..].trim();
                                        if current_key.eq_ignore_ascii_case(sync_key)
                                            || current_val.eq_ignore_ascii_case(sync_key)
                                        {
                                            let indent_len = line.len() - trimmed.len();
                                            let indent = &line[..indent_len];
                                            let prefix = &trimmed[..=eq_pos];
                                            lines.push(format!("{}{}{}", indent, prefix, profile_name));
                                            replaced = true;
                                            continue;
                                        }
                                    }
                                    lines.push(line.to_string());
                                }
                            }
                        }

                        if !replaced {
                            let standard_keys = ["account_name", "username", "personaname", "nickname", "playername", "accountid"];
                            let mut auto_replaced = false;
                            let mut new_lines: Vec<String> = Vec::new();
                            for line in lines.iter() {
                                let trimmed = line.trim_start();
                                if !auto_replaced {
                                    if let Some(eq_pos) = trimmed.find('=') {
                                        let current_key = trimmed[..eq_pos].trim();
                                        if standard_keys.iter().any(|&k| current_key.eq_ignore_ascii_case(k)) {
                                            let indent_len = line.len() - trimmed.len();
                                            let indent = &line[..indent_len];
                                            let prefix = &trimmed[..=eq_pos];
                                            new_lines.push(format!("{}{}{}", indent, prefix, profile_name));
                                            auto_replaced = true;
                                            continue;
                                        }
                                    }
                                }
                                new_lines.push(line.clone());
                            }
                            if auto_replaced {
                                lines = new_lines;
                                replaced = true;
                            }
                        }

                        if !replaced {
                            lines.push(format!("{}={}", sync_key, profile_name));
                        }

                        if let Some(parent) = target_file_path.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        let new_content = lines.join("\r\n");
                        let _ = std::fs::write(&target_file_path, new_content.as_bytes());
                    } else {
                        // Plain text overwrite
                        if let Some(parent) = target_file_path.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        let _ = std::fs::write(&target_file_path, profile_name.as_bytes());
                    }
                }
            }
        }
    }

    // 4. Create shortcut
    if create_shortcut && !exe_filename.is_empty() {
        let _ = window.emit("patch-progress", ProgressPayload {
            status: "shortcut".to_string(),
            progress: 100,
            message: "กำลังสร้าง Shortcut บน Desktop...".to_string(),
        });
        
        let target_exe = format!("{}\\{}", install_path, exe_filename);
        if std::path::Path::new(&target_exe).exists() {
            let clean_title = title.replace(|c: char| !c.is_alphanumeric() && c != ' ', "");
            let shortcut_script = format!(
                "$WshShell = New-Object -ComObject WScript.Shell; \
                 $Shortcut = $WshShell.CreateShortcut(\"$Home\\Desktop\\{}.lnk\"); \
                 $Shortcut.TargetPath = '{}'; \
                 $Shortcut.WorkingDirectory = '{}'; \
                 $Shortcut.Save()",
                clean_title, target_exe.replace("'", "''"), install_path.replace("'", "''")
            );
            let _ = create_command("powershell")
                .args(&["-NoProfile", "-Command", &shortcut_script])
                .output();
        }
    }
    
    let _ = window.emit("patch-progress", ProgressPayload {
        status: "success".to_string(),
        progress: 100,
        message: "ติดตั้ง Patch เรียบร้อยแล้ว!".to_string(),
    });
    
    Ok(install_path)
}

#[derive(serde::Serialize, Clone)]
struct SystemPatchProgressPayload {
    step: i32,
    total_steps: i32,
    status: String,
    progress: i32,
    message: String,
}

#[derive(serde::Serialize, Clone)]
struct SystemPatchStatus {
    steam_path: String,
    steam_user: String,
    appdata_user: String,
    appdata_diby_path: String,
    has_toml: bool,
    toml_content: String,
    has_xinput: bool,
    has_opensteamtool_dll: bool,
    has_dwmapi: bool,
    all_files_exist: bool,
    missing_files: Vec<String>,
    toml_valid: bool,
    is_installed: bool,
    installed_version: String,
    is_steam_running: bool,
}

fn check_file_exists_in_dir(dir: &std::path::Path, target_name: &str) -> bool {
    let direct_path = dir.join(target_name);
    if direct_path.exists() {
        return true;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.eq_ignore_ascii_case(target_name) {
                    return true;
                }
            }
        }
    }
    false
}

#[tauri::command]
fn get_system_patch_status(app: tauri::AppHandle) -> SystemPatchStatus {
    let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
    let mut steam_user = "Unknown".to_string();
    if let Some((path, user)) = get_steam_registry_values() {
        if !path.is_empty() {
            steam_path = path;
        }
        if !user.is_empty() {
            steam_user = user;
        }
    }

    let appdata_user = std::env::var("USERNAME").unwrap_or_else(|_| "User".to_string());
    let diby_path = get_diby_dir(&app).to_string_lossy().replace("\\", "/");

    let steam_dir = std::path::Path::new(&steam_path);
    let has_digibyte_dll = check_file_exists_in_dir(steam_dir, "DigiByte.dll")
        || check_file_exists_in_dir(steam_dir, "DigiByte.dl");
    let has_opensteamtool_dll = check_file_exists_in_dir(steam_dir, "OpenSteamTool.dll") 
        || check_file_exists_in_dir(steam_dir, "OpenSteamTool.dl");
    let has_patch_dll = has_digibyte_dll || has_opensteamtool_dll;
    
    let has_dwmapi = check_file_exists_in_dir(steam_dir, "dwmapi.dll");
    let has_xinput = check_file_exists_in_dir(steam_dir, "xinput1_4.dll");
    let has_loader = has_dwmapi || has_xinput;

    let has_digibyte_toml = check_file_exists_in_dir(steam_dir, "digibyte.toml");
    let has_ost_toml = check_file_exists_in_dir(steam_dir, "opensteamtool.toml");
    let has_toml = has_digibyte_toml || has_ost_toml;

    let mut missing_files = Vec::new();
    if !has_patch_dll {
        missing_files.push("DigiByte.dll".to_string());
    }
    if !has_loader {
        missing_files.push("dwmapi.dll".to_string());
    }

    let all_files_exist = missing_files.is_empty();

    let toml_path_digibyte = format!(r"{}\digibyte.toml", steam_path);
    let toml_path_ost = format!(r"{}\opensteamtool.toml", steam_path);
    let toml_content = if std::path::Path::new(&toml_path_digibyte).exists() {
        std::fs::read_to_string(&toml_path_digibyte).unwrap_or_default()
    } else if std::path::Path::new(&toml_path_ost).exists() {
        std::fs::read_to_string(&toml_path_ost).unwrap_or_default()
    } else {
        String::new()
    };

    // Toml is no longer mandatory since defaults (%APPDATA%/diby) are hardcoded into DigiByte.dll
    let toml_valid = true;

    // Extract installed version: Check .patch_manifest.json first, then toml if available
    let mut installed_version = String::new();
    let manifest_path = steam_dir.join(".patch_manifest.json");
    if manifest_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<PatchManifest>(&content) {
                installed_version = manifest.version.trim_start_matches(|c| c == 'v' || c == 'V').to_string();
            }
        }
    }

    if installed_version.is_empty() && has_toml {
        for line in toml_content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("# version =") || trimmed.starts_with("version =") || trimmed.starts_with("# version:") {
                if let Some((_, v)) = trimmed.split_once('=') {
                    installed_version = v.trim().trim_matches('"').trim_matches('\'').trim_start_matches(|c| c == 'v' || c == 'V').to_string();
                } else if let Some((_, v)) = trimmed.split_once(':') {
                    installed_version = v.trim().trim_matches('"').trim_matches('\'').trim_start_matches(|c| c == 'v' || c == 'V').to_string();
                }
            }
        }
    }

    // If installed and files exist but no version record, default to 1.0.4
    if installed_version.is_empty() && all_files_exist {
        installed_version = "1.0.4".to_string();
    }

    // Condition: Core patch DLL and loader DLL must exist
    let is_installed = all_files_exist;

    let is_steam_running = is_steam_running();

    SystemPatchStatus {
        steam_path,
        steam_user,
        appdata_user,
        appdata_diby_path: diby_path,
        has_toml,
        toml_content,
        has_xinput,
        has_opensteamtool_dll: has_patch_dll,
        has_dwmapi,
        all_files_exist,
        missing_files,
        toml_valid,
        is_installed,
        installed_version,
        is_steam_running,
    }
}

#[tauri::command]
fn open_folder_in_explorer(path: String) -> bool {
    let clean_path = path.replace("/", "\\");
    let _ = create_command("explorer")
        .arg(&clean_path)
        .spawn();
    true
}

#[derive(serde::Serialize, Clone)]
struct SystemSpecs {
    os: String,
    cpu: String,
    gpu: String,
    ram: String,
}

#[tauri::command]
async fn get_system_specs() -> SystemSpecs {
    tauri::async_runtime::spawn_blocking(|| {
        let mut specs = SystemSpecs {
            os: "Unknown OS".to_string(),
            cpu: "Unknown CPU".to_string(),
            gpu: "Unknown GPU".to_string(),
            ram: "Unknown RAM".to_string(),
        };

        if cfg!(target_os = "windows") {
            let ps_cmd = r#"
                $os = (Get-CimInstance Win32_OperatingSystem).Caption.Trim();
                $cpu = (Get-CimInstance Win32_Processor).Name;
                $cpu = $cpu -replace '\(R\)|\(TM\)', '';
                $cpu = $cpu -replace '\s+with\s+.*', '';
                $cpu = $cpu.Trim() -replace '\s+', ' ';
                $g = @((Get-CimInstance Win32_VideoController).Name).Where({ $_ -notmatch 'Virtual|Todesk|AnyDesk|TeamViewer|Mirror|Citrix|RDP|LogMeIn|VNC' });
                if ($g.Count -gt 1) {
                    $d = $g.Where({ $_ -match 'NVIDIA|GeForce|GTX|RTX|Quadro|RX|Arc|Radeon Pro' });
                    if ($d) { $g = $d }
                };
                $gpus = ($g -join ' / ') -replace '\(R\)|\(TM\)', '';
                $ram = 0;
                foreach ($c in (Get-CimInstance Win32_PhysicalMemory).Capacity) { $ram += $c };
                $ram = [math]::round($ram / 1GB);
                write-output "OS:$os";
                write-output "CPU:$cpu";
                write-output "GPU:$gpus";
                write-output "RAM:$ram GB";
            "#;

            let output = create_command("powershell")
                .args(&["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd])
                .output();

            if let Ok(out) = output {
                let stdout = String::from_utf8_lossy(&out.stdout);
                for line in stdout.lines() {
                    if line.starts_with("OS:") {
                        specs.os = line["OS:".len()..].trim().to_string();
                    } else if line.starts_with("CPU:") {
                        specs.cpu = line["CPU:".len()..].trim().to_string();
                    } else if line.starts_with("GPU:") {
                        specs.gpu = line["GPU:".len()..].trim().to_string();
                    } else if line.starts_with("RAM:") {
                        specs.ram = line["RAM:".len()..].trim().to_string();
                    }
                }
            }
        } else {
            specs.os = "macOS / Linux (Simulated)".to_string();
            specs.cpu = "Intel Core i7-10700K".to_string();
            specs.gpu = "NVIDIA GeForce RTX 3070".to_string();
            specs.ram = "16 GB".to_string();
        }

        specs
    })
    .await
    .unwrap_or_else(|_| SystemSpecs {
        os: "Unknown OS".to_string(),
        cpu: "Unknown CPU".to_string(),
        gpu: "Unknown GPU".to_string(),
        ram: "Unknown RAM".to_string(),
    })
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct PatchManifest {
    version: String,
    installed_files: Vec<String>,
}

fn collect_relative_files(dir: &std::path::Path, prefix: &str, files: &mut Vec<String>) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();
            let rel_path = if prefix.is_empty() {
                file_name.clone()
            } else {
                format!("{}/{}", prefix, file_name)
            };
            if path.is_dir() {
                collect_relative_files(&path, &rel_path, files);
            } else {
                files.push(rel_path);
            }
        }
    }
}

fn is_safe_to_delete_patch_file(rel_path: &str) -> bool {
    let normalized = rel_path.replace("\\", "/");
    let trimmed = normalized.trim().trim_start_matches('/');
    if trimmed.is_empty() || trimmed.contains("..") {
        return false;
    }
    let lower = trimmed.to_lowercase();
    
    // Strict blacklist of vital Steam core executable and library files
    let blocked_exact = [
        "steam.exe",
        "steam.dll",
        "tier0_s.dll",
        "tier0_s64.dll",
        "vstdlib_s.dll",
        "vstdlib_s64.dll",
        "crashhandler.dll",
        "crashhandler64.dll",
        "steamclient.dll",
        "steamclient64.dll",
        "steamservice.exe",
        "steamerrorreporter.exe",
        "steamerrorreporter64.exe",
        "gameoverlayui.exe",
        "steamwebhelper.exe",
    ];
    for b in &blocked_exact {
        if lower == *b {
            return false;
        }
    }

    // Never delete anything inside core Steam directories
    let blocked_prefixes = [
        "steamapps",
        "userdata",
        "config",
        "logs",
        "dumps",
        "depotcache",
        "tenfoot",
        "resource",
        "graphics",
        "music",
        "servers",
        "public",
        "package",
    ];
    for p in &blocked_prefixes {
        if lower == *p || lower.starts_with(&format!("{}/", p)) {
            return false;
        }
    }

    true
}

fn clean_patch_files_from_steam(steam_path: &str) {
    let steam_dir = std::path::Path::new(steam_path);
    if !steam_dir.exists() {
        return;
    }

    let manifest_path = steam_dir.join(".patch_manifest.json");
    let mut files_to_delete: Vec<String> = Vec::new();

    // 1. Read files from .patch_manifest.json if present
    if manifest_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&manifest_path) {
            if let Ok(manifest) = serde_json::from_str::<PatchManifest>(&content) {
                for file in manifest.installed_files {
                    if is_safe_to_delete_patch_file(&file) {
                        files_to_delete.push(file);
                    }
                }
            }
        }
    }

    // 2. Add fallback list of known patch files (for older installs or unmanifested files)
    let fallback_files = [
        "digibyte.toml",
        "opensteamtool.toml",
        "opensteamtools.toml",
        "DigiByte.dll",
        "DigiByte.dl",
        "OpenSteamTool.dll",
        "OpenSteamTool.dl",
        "dwmapi.dll",
        "xinput1_4.dll",
        "st.dll",
        "SteamTools.dll",
        ".patch_manifest.json",
    ];
    for f in &fallback_files {
        let s = f.to_string();
        if !files_to_delete.iter().any(|item| item.eq_ignore_ascii_case(&s)) {
            files_to_delete.push(s);
        }
    }

    // 3. Delete files safely with read-only flag clearance
    for file_name in &files_to_delete {
        if !is_safe_to_delete_patch_file(file_name) {
            continue;
        }
        let normalized = file_name.replace("/", "\\");
        let file_path = steam_dir.join(&normalized);
        if file_path.exists() {
            if let Ok(metadata) = file_path.metadata() {
                let mut permissions = metadata.permissions();
                permissions.set_readonly(false);
                let _ = std::fs::set_permissions(&file_path, permissions);
            }
            let _ = std::fs::remove_file(&file_path);
        }

        // Case-insensitive deletion check for root items
        if !file_name.contains('/') && !file_name.contains('\\') {
            if let Ok(entries) = std::fs::read_dir(steam_dir) {
                for entry in entries.flatten() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.eq_ignore_ascii_case(file_name) && is_safe_to_delete_patch_file(name) {
                            let p = entry.path();
                            if let Ok(metadata) = p.metadata() {
                                let mut permissions = metadata.permissions();
                                permissions.set_readonly(false);
                                let _ = std::fs::set_permissions(&p, permissions);
                            }
                            let _ = std::fs::remove_file(p);
                        }
                    }
                }
            }
        }
    }

    // 4. Extra sweep for any legacy toml config files in Steam root
    if let Ok(entries) = std::fs::read_dir(steam_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                let lower = name.to_lowercase();
                if (lower.ends_with(".toml") && (lower.contains("steamtool") || lower.contains("digibyte"))) 
                    && is_safe_to_delete_patch_file(name) 
                {
                    let p = entry.path();
                    if let Ok(metadata) = p.metadata() {
                        let mut permissions = metadata.permissions();
                        permissions.set_readonly(false);
                        let _ = std::fs::set_permissions(&p, permissions);
                    }
                    let _ = std::fs::remove_file(p);
                }
            }
        }
    }

    // Finally ensure .patch_manifest.json itself is removed
    if manifest_path.exists() {
        if let Ok(metadata) = manifest_path.metadata() {
            let mut permissions = metadata.permissions();
            permissions.set_readonly(false);
            let _ = std::fs::set_permissions(&manifest_path, permissions);
        }
        let _ = std::fs::remove_file(&manifest_path);
    }
}

#[tauri::command]
fn uninstall_system_patch() -> Result<String, String> {
    let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
    if let Some((path, _)) = get_steam_registry_values() {
        if !path.is_empty() {
            steam_path = path;
        }
    }

    // 1. Force close Steam to release any open DLL file locks
    if cfg!(target_os = "windows") {
        if is_steam_running() {
            kill_steam_thoroughly();
        }
    }

    clean_patch_files_from_steam(&steam_path);

    Ok("ถอนการติดตั้งระบบ Patch เรียบร้อยแล้ว".to_string())
}

#[tauri::command]
async fn install_system_patch(
    app: tauri::AppHandle,
    window: tauri::Window,
    download_url: String,
    version: String,
) -> Result<String, String> {
    let mut steam_path = r"C:\Program Files (x86)\Steam".to_string();
    if let Some((path, _)) = get_steam_registry_values() {
        if !path.is_empty() {
            steam_path = path;
        }
    }

    if !std::path::Path::new(&steam_path).exists() {
        return Err(format!("ไม่พบโฟลเดอร์ติดตั้งของ Steam ที่ [{}] กรุณาตรวจสอบการติดตั้ง Steam ในเครื่อง", steam_path));
    }

    let diby_folder = get_diby_dir(&app);

    // Ensure diby directory exists
    let _ = std::fs::create_dir_all(&diby_folder);

    // STEP 1: Check System & Environment
    let _ = window.emit("system-patch-progress", SystemPatchProgressPayload {
        step: 1,
        total_steps: 5,
        status: "checking_system".to_string(),
        progress: 10,
        message: "กำลังตรวจสอบระบบก่อนดำเนินการ...".to_string(),
    });
    std::thread::sleep(std::time::Duration::from_millis(200));

    let clean_version = version.trim_start_matches(|c| c == 'v' || c == 'V' || c == '.');
    let version_str = format!("v{}", clean_version);

    // STEP 2: Download Patch Natively in Rust (download while Steam is still running to minimize downtime & prevent race condition)
    let _ = window.emit("system-patch-progress", SystemPatchProgressPayload {
        step: 2,
        total_steps: 5,
        status: "downloading".to_string(),
        progress: 20,
        message: format!("กำลังดาวน์โหลด Patch ระบบ ({})...", version_str),
    });

    let window_clone = window.clone();
    let download_url_clone = download_url.clone();
    let version_display_clone = version_str.clone();
    let steam_path_clone = steam_path.clone();

    let res = tauri::async_runtime::spawn_blocking(move || {
        let bytes = download_with_progress(&download_url_clone, |pct| {
            let scaled_progress = 20 + ((pct * 30) / 100); // Scales 20% -> 50%
            let _ = window_clone.emit("system-patch-progress", SystemPatchProgressPayload {
                step: 2,
                total_steps: 5,
                status: "downloading".to_string(),
                progress: scaled_progress,
                message: format!("กำลังดาวน์โหลด Patch ระบบ ({})... {}%", version_display_clone, pct),
            });
        })?;

        // Extract zip to temporary folder first
        let temp_dir = std::env::temp_dir().join("DigiManagerSystemPatch");
        let extract_dir = temp_dir.join("extracted");
        if extract_dir.exists() {
            let _ = std::fs::remove_dir_all(&extract_dir);
        }
        extract_zip(&bytes, &extract_dir)?;

        // Collect all relative files in extract_dir for manifest tracking
        let mut manifest_files: Vec<String> = Vec::new();
        collect_relative_files(&extract_dir, "", &mut manifest_files);
        if !manifest_files.iter().any(|f| f.eq_ignore_ascii_case(".patch_manifest.json")) {
            manifest_files.push(".patch_manifest.json".to_string());
        }

        // STEP 3: Close Steam thoroughly right before cleaning old files & copying new files
        let _ = window_clone.emit("system-patch-progress", SystemPatchProgressPayload {
            step: 3,
            total_steps: 5,
            status: "closing_steam".to_string(),
            progress: 55,
            message: "กำลังปิดระบบ Steam เพื่อเตรียมติดตั้ง...".to_string(),
        });

        kill_steam_thoroughly();

        // STEP 4 (Inserted Clean Uninstall): Clean/Uninstall old patch files from Steam folder first!
        let _ = window_clone.emit("system-patch-progress", SystemPatchProgressPayload {
            step: 4,
            total_steps: 5,
            status: "cleaning_old".to_string(),
            progress: 65,
            message: "กำลังถอนการติดตั้งและล้างไฟล์ Patch เวอร์ชันเดิม...".to_string(),
        });

        clean_patch_files_from_steam(&steam_path_clone);
        std::thread::sleep(std::time::Duration::from_millis(150));

        // STEP 4 continued: Copy extracted files to Steam directory & configure
        let _ = window_clone.emit("system-patch-progress", SystemPatchProgressPayload {
            step: 4,
            total_steps: 5,
            status: "copying".to_string(),
            progress: 75,
            message: "กำลังคัดลอกไฟล์ Patch ลงโฟลเดอร์ Steam...".to_string(),
        });

        if let Err(e) = copy_dir_all(&extract_dir, &steam_path_clone) {
            let _ = std::fs::remove_dir_all(&temp_dir);
            return Err(if e.kind() == std::io::ErrorKind::PermissionDenied {
                "การติดตั้งล้มเหลว: ถูกปฏิเสธการเข้าถึงโฟลเดอร์ Steam (กรุณาปิด Steam หรือรันแอปด้วย Administrator)".to_string()
            } else {
                format!("ไม่สามารถคัดลอกไฟล์ Patch ได้: {}", e)
            });
        }
        let _ = std::fs::remove_dir_all(&temp_dir);

        // Ensure no legacy toml config remains in Steam folder after extraction
        let toml_targets = ["opensteamtool.toml", "opensteamtools.toml", "digibyte.toml"];
        for toml_name in &toml_targets {
            let p = std::path::Path::new(&steam_path_clone).join(toml_name);
            if p.exists() {
                if let Ok(metadata) = p.metadata() {
                    let mut permissions = metadata.permissions();
                    permissions.set_readonly(false);
                    let _ = std::fs::set_permissions(&p, permissions);
                }
                let _ = std::fs::remove_file(&p);
            }
        }

        Ok(manifest_files)
    }).await.map_err(|e| format!("Task failed: {}", e))?;
    
    let manifest_files = match res {
        Ok(files) => files,
        Err(err_desc) => {
            let _ = window.emit("system-patch-progress", SystemPatchProgressPayload {
                step: 4,
                total_steps: 5,
                status: "error".to_string(),
                progress: 0,
                message: err_desc.clone(),
            });
            return Err(err_desc);
        }
    };

    // STEP 4 continued: Save .patch_manifest.json for future uninstalls / version tracking
    let _ = window.emit("system-patch-progress", SystemPatchProgressPayload {
        step: 4,
        total_steps: 5,
        status: "configuring".to_string(),
        progress: 90,
        message: "กำลังบันทึกการตั้งค่าระบบ...".to_string(),
    });

    let manifest = PatchManifest {
        version: clean_version.to_string(),
        installed_files: manifest_files,
    };
    if let Ok(manifest_json) = serde_json::to_string_pretty(&manifest) {
        let manifest_path = format!(r"{}\.patch_manifest.json", steam_path);
        let _ = std::fs::write(&manifest_path, manifest_json);
    }

    // STEP 5: Launch Steam
    let _ = window.emit("system-patch-progress", SystemPatchProgressPayload {
        step: 5,
        total_steps: 5,
        status: "launching_steam".to_string(),
        progress: 95,
        message: "กำลังเปิดโปรแกรม Steam ใหม่อัตโนมัติ...".to_string(),
    });

    let steam_exe = format!(r"{}\steam.exe", steam_path);
    if std::path::Path::new(&steam_exe).exists() {
        let _ = create_command(&steam_exe).spawn();
    }

    // Success!
    let _ = window.emit("system-patch-progress", SystemPatchProgressPayload {
        step: 5,
        total_steps: 5,
        status: "success".to_string(),
        progress: 100,
        message: "ติดตั้ง Patch ระบบเรียบร้อยแล้ว!".to_string(),
    });

    Ok("success".to_string())
}

#[derive(serde::Serialize, Clone)]
struct AppUpdateProgressPayload {
    status: String,
    progress: i32,
    message: String,
}

#[tauri::command]
async fn update_app_executable(
    app: tauri::AppHandle,
    window: tauri::Window,
    download_url: String,
) -> Result<String, String> {
    let _ = window.emit("app-update-progress", AppUpdateProgressPayload {
        status: "preparing".to_string(),
        progress: 0,
        message: "กำลังเตรียมการดาวน์โหลดอัปเดต...".to_string(),
    });

    let current_exe = std::env::current_exe()
        .map_err(|e| format!("ไม่สามารถตรวจสอบตำแหน่งโปรแกรมปัจจุบันได้: {}", e))?;

    let window_clone = window.clone();
    let download_url_clone = download_url.clone();
    let current_exe_clone = current_exe.clone();

    let res = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _ = window_clone.emit("app-update-progress", AppUpdateProgressPayload {
            status: "downloading".to_string(),
            progress: 5,
            message: "กำลังดาวน์โหลดไฟล์อัปเดตเวอร์ชันใหม่... 0%".to_string(),
        });

        let bytes = download_with_progress(&download_url_clone, |pct| {
            let _ = window_clone.emit("app-update-progress", AppUpdateProgressPayload {
                status: "downloading".to_string(),
                progress: pct,
                message: format!("กำลังดาวน์โหลดไฟล์อัปเดต... {}%", pct),
            });
        })?;

        if bytes.is_empty() {
            return Err("ไฟล์ที่ดาวน์โหลดมาว่างเปล่า (Empty file)".to_string());
        }

        let _ = window_clone.emit("app-update-progress", AppUpdateProgressPayload {
            status: "extracting".to_string(),
            progress: 90,
            message: "กำลังเตรียมไฟล์โปรแกรมตัวใหม่...".to_string(),
        });

        // Determine if file is ZIP or raw EXE
        let temp_dir = std::env::temp_dir().join(format!("DigiManagerUpdate_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let extracted_new_exe = temp_dir.join("new_digimanager.exe");

        if bytes.starts_with(b"PK\x03\x04") {
            // It's a zip archive: extract and find any .exe inside
            let extract_folder = temp_dir.join("unzipped");
            extract_zip(&bytes, &extract_folder)?;
            
            let mut found_exe: Option<std::path::PathBuf> = None;
            if let Ok(entries) = std::fs::read_dir(&extract_folder) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() && path.extension().and_then(|s| s.to_str()).map(|ext| ext.eq_ignore_ascii_case("exe")).unwrap_or(false) {
                        found_exe = Some(path);
                        break;
                    }
                }
            }
            if let Some(target_exe) = found_exe {
                std::fs::copy(&target_exe, &extracted_new_exe)
                    .map_err(|e| format!("ไม่สามารถเตรียมไฟล์ exe ใหม่ได้: {}", e))?;
            } else {
                let _ = std::fs::remove_dir_all(&temp_dir);
                return Err("ไม่พบไฟล์ .exe ภายในไฟล์ Zip ที่ดาวน์โหลดมา".to_string());
            }
        } else {
            // It's a raw .exe binary
            std::fs::write(&extracted_new_exe, &bytes)
                .map_err(|e| format!("ไม่สามารถเขียนไฟล์ชั่วคราวได้: {}", e))?;
        }

        let _ = window_clone.emit("app-update-progress", AppUpdateProgressPayload {
            status: "applying".to_string(),
            progress: 95,
            message: "กำลังเตรียมสลับไฟล์และรีสตาร์ทโปรแกรม...".to_string(),
        });

        // Launch background invisible handoff script (PowerShell)
        // 1. Waits for current process to completely terminate (avoiding Single Instance conflict)
        // 2. Directly copies extracted_new_exe over current_exe (no .old file ever created!)
        // 3. Spawns the updated application seamlessly
        // 4. Cleans up temp files
        let current_pid = std::process::id();
        let target_exe_escaped = current_exe_clone.to_string_lossy().replace("'", "''");
        let new_exe_escaped = extracted_new_exe.to_string_lossy().replace("'", "''");
        let temp_dir_escaped = temp_dir.to_string_lossy().replace("'", "''");

        let ps_script = format!(
            "$p = {pid}; \
             $t = '{target}'; \
             $n = '{new}'; \
             $d = '{dir}'; \
             for ($i=0; $i -lt 30; $i++) {{ \
                 if (-not (Get-Process -Id $p -ErrorAction SilentlyContinue)) {{ break; }} \
                 Start-Sleep -Milliseconds 200; \
             }} \
             Start-Sleep -Milliseconds 150; \
             Copy-Item -Path $n -Destination $t -Force; \
             Start-Process -FilePath $t; \
             Start-Sleep -Milliseconds 500; \
             Remove-Item -Path $d -Recurse -Force -ErrorAction SilentlyContinue",
            pid = current_pid,
            target = target_exe_escaped,
            new = new_exe_escaped,
            dir = temp_dir_escaped
        );

        let _ = create_command("powershell")
            .args(&[
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &ps_script,
            ])
            .spawn();

        let _ = window_clone.emit("app-update-progress", AppUpdateProgressPayload {
            status: "success".to_string(),
            progress: 100,
            message: "อัปเดตเรียบร้อยแล้ว กำลังเปิดโปรแกรมเวอร์ชันใหม่...".to_string(),
        });

        Ok(())
    }).await.map_err(|e| format!("Task failed: {}", e))?;

    if let Err(err) = res {
        let _ = window.emit("app-update-progress", AppUpdateProgressPayload {
            status: "error".to_string(),
            progress: 0,
            message: err.clone(),
        });
        return Err(err);
    }

    // Give a brief delay for UI to show completion before exiting old process
    let app_handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        app_handle.exit(0);
    });

    Ok("success".to_string())
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .manage(ActiveProcessState { child: Mutex::new(None) })
        .setup(|app| {
            // 0. Clean up any lingering .old or .new executable files in the current folder
            if let Ok(current_exe) = std::env::current_exe() {
                if let Some(exe_dir) = current_exe.parent() {
                    let exe_name = current_exe.file_name().unwrap_or_default().to_string_lossy();
                    let old_exe = exe_dir.join(format!("{}.old", exe_name));
                    if old_exe.exists() {
                        let _ = std::fs::remove_file(&old_exe);
                    }
                    let new_exe = exe_dir.join(format!("{}.new", exe_name));
                    if new_exe.exists() {
                        let _ = std::fs::remove_file(&new_exe);
                    }
                }
            }

            // 1. Create System Tray Menu
            let quit_i = MenuItem::with_id(app, "quit", "ออกจากโปรแกรม", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "เปิด DigiManager", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("DigiManager")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 2. Refresh autostart registry to keep current exe path up to date if enabled
            if get_autostart_status() {
                let _ = set_autostart_status(true);
            }

            // 3. Check if launched with --minimized / --silent
            let args: Vec<String> = std::env::args().collect();
            if args.iter().any(|arg| arg == "--minimized" || arg == "--silent") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_steam_user, 
            get_steam_profile_name,
            get_steam_path,
            get_autostart_status,
            set_autostart_status,
            get_diby_path,
            check_lua_file, 
            check_lua_files,
            write_lua_file, 
            delete_lua_file, 
            read_lua_file, 
            create_desktop_shortcut, 
            install_patch,
            cancel_patch,
            get_system_patch_status,
            open_folder_in_explorer,
            pick_folder,
            install_system_patch,
            uninstall_system_patch,
            hide_window,
            get_system_specs,
            update_app_executable,
            exit_app,
            get_depotcache_path,
            write_manifest_file,
            extract_manifest_zip,
            download_and_extract_manifest_zip,
            check_manifest_files,
            open_depotcache_folder,
            restart_steam,
            clear_game_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_download() {
        let res = tauri::async_runtime::block_on(download_and_extract_manifest_zip("https://files.catbox.moe/4ddggf.zip".to_string(), None));
        assert!(res.is_ok(), "Manifest download failed: {:?}", res.err());
    }
}



