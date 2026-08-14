"use strict";
/*
 * wow-335a provisioning — faithful port of WoW Mobile's Provisioner.java
 * (github.com/marcocastignoli/wow-mobile) onto the Gamelator sandbox API.
 *
 * Idempotent and versioned: state lives in the in-folder store (gamelator.json).
 * Phase A (files) runs once per VERSION; per-account steps run as soon as each
 * account folder exists (after the user's first login + logout). The script's
 * completion value tells the engine whether a user step is still outstanding.
 */

var VERSION = 1;
var DEFAULT_REALMLIST = "logon.therawow.com";

/* Keystroke → ConsolePort button map: the touch overlay emits these keys,
   ConsolePortLK turns them into virtual gamepad buttons. */
var BINDINGS = [
    ["Y", "CP_R_UP"], ["B", "CP_R_RIGHT"], ["N", "CP_R_DOWN"], ["H", "CP_R_LEFT"],
    ["I", "CP_L_UP"], ["L", "CP_L_RIGHT"], ["K", "CP_L_DOWN"], ["J", "CP_L_LEFT"],
    ["Q", "CP_T1"], ["E", "CP_T2"],
    ["G", "CP_X_LEFT"], ["V", "CP_X_RIGHT"],
    ["F", "INTERACTTARGET"]
];

/* Locale folder (enUS, enGB, deDE, ...) inside Data/: 4 chars, lower/upper
   pattern; prefer the one already holding realmlist.wtf. */
function localeDirName() {
    if (!game.exists("Data")) return null;
    var candidate = null;
    var entries = game.list("Data");
    for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (!e.dir || e.name.length !== 4) continue;
        if (!/^[a-z].[A-Z].$/.test(e.name)) continue;
        if (game.exists("Data/" + e.name + "/realmlist.wtf")) return e.name;
        if (candidate === null) candidate = e.name;
    }
    return candidate;
}

/* Sets (or replaces) a single SET key in WTF/Config.wtf, dropping duplicates
   and blank lines — same semantics as Provisioner.setConfigValue. */
function setConfigValue(key, value) {
    var lines = [];
    var found = false;
    if (game.exists("WTF/Config.wtf")) {
        var content = game.read("WTF/Config.wtf").split("\n");
        for (var i = 0; i < content.length; i++) {
            var trimmed = content[i].trim();
            if (trimmed.indexOf("SET " + key + " ") === 0) {
                if (found) continue;
                lines.push('SET ' + key + ' "' + value + '"');
                found = true;
            } else if (trimmed !== "") {
                lines.push(content[i].replace(/\r/g, ""));
            }
        }
    }
    if (!found) lines.push('SET ' + key + ' "' + value + '"');
    game.write("WTF/Config.wtf", lines.join("\n") + "\n");
}

/* Sets the active realm in Data/<locale>/realmlist.wtf. Previous active lines
   are commented out (they stay available as switcher choices); user comments
   and blanks are preserved. */
function ensureRealmlist(host) {
    var locale = localeDirName();
    if (locale === null) throw new Error("no locale folder found under Data/");
    var path = "Data/" + locale + "/realmlist.wtf";

    var kept = [];
    if (game.exists(path)) {
        var lines = game.read(path).split("\n");
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim();
            if (trimmed !== "" && trimmed.charAt(0) !== "#" &&
                    trimmed.toLowerCase().indexOf("set realmlist") === 0) {
                if (trimmed.toLowerCase() !== ("set realmlist " + host).toLowerCase())
                    kept.push("# " + trimmed);
                continue;
            }
            kept.push(lines[i].replace(/\r/g, ""));
        }
    }
    while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
    kept.push("set realmlist " + host);
    game.write(path, kept.join("\n") + "\n");

    state.set("realmlist", host);
    setConfigValue("realmList", host); // WoW rewrites Config.wtf on exit anyway
}

/* Makes ConsolePort keyboard bindings account-wide instead of per-character. */
function patchToc() {
    var path = "Interface/AddOns/ConsolePort/ConsolePort.toc";
    if (!game.exists(path)) throw new Error("ConsolePort.toc missing after addon install");
    var lines = game.read(path).split("\n");
    var out = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf("## SavedVariables:") === 0 && line.indexOf("ConsolePortBindingSet") < 0) {
            line = line.trim() + ", ConsolePortBindingSet";
        } else if (line.indexOf("## SavedVariablesPerCharacter:") === 0) {
            line = line.split("ConsolePortBindingSet,").join("")
                       .split(", ConsolePortBindingSet").join("")
                       .split("ConsolePortBindingSet").join("")
                       .split(":,").join(":");
        }
        out.push(line);
    }
    game.write(path, out.join("\n"));
}

/* Tuned defaults for Mali-class phones; existing user keys are replaced,
   everything else preserved. */
function patchConfigDefaults() {
    var locale = localeDirName();
    var defaults = [
        ["locale", locale !== null ? locale : "enUS"],
        ["realmList", state.get("realmlist") || DEFAULT_REALMLIST],
        ["hwDetect", "0"],
        ["gxWindow", "1"],
        ["gxMaximize", "1"],
        ["gxResolution", "960x432"],
        ["gxRefresh", "60"],
        ["gxMultisampleQuality", "0.000000"],
        ["gxFixLag", "0"],
        ["videoOptionsVersion", "3"],
        ["movie", "0"],
        ["readTOS", "1"],
        ["readEULA", "1"],
        ["readTerminationWithoutNotice", "1"],
        ["accounttype", "LK"],
        ["farclip", "727"],
        ["textureFilteringMode", "0"],
        ["particleDensity", "0.10000000149012"],
        ["baseMip", "1"],
        ["environmentDetail", "0.5"],
        ["weatherDensity", "0"],
        ["ffxGlow", "0"],
        ["ffxDeath", "0"]
    ];
    for (var i = 0; i < defaults.length; i++) setConfigValue(defaults[i][0], defaults[i][1]);
}

/* Rewrites bindings-cache.wtf: drops stale "bind KEY NONE" suppressions and
   conflicting binds for our keys, then appends the ConsolePort map. */
function patchBindingsCache(accountPath) {
    var path = accountPath + "/bindings-cache.wtf";
    var kept = [];
    if (game.exists(path)) {
        var lines = game.read(path).split("\n");
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim().replace(/\r/g, "");
            if (trimmed === "") continue;
            var conflicting = false;
            for (var j = 0; j < BINDINGS.length; j++) {
                if (trimmed.indexOf("bind " + BINDINGS[j][0] + " ") === 0) {
                    conflicting = true;
                    break;
                }
            }
            if (!conflicting) kept.push(trimmed);
        }
    }
    for (var j = 0; j < BINDINGS.length; j++)
        kept.push("bind " + BINDINGS[j][0] + " " + BINDINGS[j][1]);
    game.write(path, kept.join("\n") + "\n");
}

/* Seeds account-wide ConsolePort settings so the addon boots calibrated
   (Xbox layout + our key calibration). Never overwrites an existing config. */
function seedSavedVariables(accountPath) {
    var path = accountPath + "/SavedVariables/ConsolePort.lua";
    if (game.exists(path) && game.read(path).indexOf("ConsolePortSettings") >= 0) return;
    var seed =
        'ConsolePortSettings = {\n' +
        '\t["type"] = "XBOX",\n' +
        '\t["skipGuideBtn"] = true,\n' +
        '\t["skipCP_T3"] = true,\n' +
        '\t["skipCP_T4"] = true,\n' +
        '\t["skipCP_T5"] = true,\n' +
        '\t["skipCP_T6"] = true,\n' +
        '\t["interactWith"] = "CP_R_DOWN",\n' +
        '\t["autoLootDefault"] = true,\n' +
        '\t["stickRadialType"] = 2,\n' +
        '\t["stickRadialLocal"] = true,\n' +
        '\t["calibration"] = {\n' +
        '\t\t["CP_R_UP"] = "Y",\n' +
        '\t\t["CP_R_RIGHT"] = "B",\n' +
        '\t\t["CP_R_DOWN"] = "N",\n' +
        '\t\t["CP_R_LEFT"] = "H",\n' +
        '\t\t["CP_L_UP"] = "I",\n' +
        '\t\t["CP_L_RIGHT"] = "L",\n' +
        '\t\t["CP_L_DOWN"] = "K",\n' +
        '\t\t["CP_L_LEFT"] = "J",\n' +
        '\t\t["CP_T1"] = "Q",\n' +
        '\t\t["CP_T2"] = "E",\n' +
        '\t\t["CP_X_LEFT"] = "G",\n' +
        '\t\t["CP_X_RIGHT"] = "V",\n' +
        '\t},\n' +
        '}\n';
    game.write(path, seed);
}

/* ---- main ---- */

if ((state.get("filesVersion") || 0) < VERSION) {
    game.extractZip(assets.get("consoleportlk"), "Interface/AddOns");
    patchToc();
    ensureRealmlist(state.get("realmlist") || DEFAULT_REALMLIST);
    patchConfigDefaults();
    state.set("filesVersion", VERSION);
    log("wow-335a: base provisioning done");
}

var provisioned = state.get("accounts") || {};
var accountCount = 0;
accounts.forEach(function (account) {
    if (account.name === "SavedVariables") return;
    accountCount++;
    if ((provisioned[account.name] || 0) >= VERSION) return;
    patchBindingsCache(account.path);
    seedSavedVariables(account.path);
    provisioned[account.name] = VERSION;
    log("wow-335a: account " + account.name + " configured");
});
state.set("accounts", provisioned);

/* Completion value = provisioning status for the engine. */
accountCount === 0 ? "waiting-user" : "ready";
