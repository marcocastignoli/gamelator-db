"use strict";
/*
 * wow-335a settings functions, called by the app's generic settings renderer.
 * Only defines functions — evaluating this file has no side effects.
 * The realmlist rewrite mirrors patch.js's ensureRealmlist (kept in sync by
 * hand; both are small on purpose).
 */

var DEFAULT_REALMLIST = "logon.therawow.com";

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

function realmlistPath() {
    var locale = localeDirName();
    return locale === null ? null : "Data/" + locale + "/realmlist.wtf";
}

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

/* Active realm + every commented alternate kept in the file + our default. */
function getRealmlists() {
    var choices = [];
    var current = null;
    var path = realmlistPath();
    if (path !== null && game.exists(path)) {
        var lines = game.read(path).split("\n");
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim();
            var uncommented = trimmed.replace(/^#+ */, "");
            if (uncommented.toLowerCase().indexOf("set realmlist") === 0) {
                var host = uncommented.substring("set realmlist".length).trim();
                if (host !== "" && choices.indexOf(host) < 0) choices.push(host);
                if (trimmed.charAt(0) !== "#" && current === null) current = host;
            }
        }
    }
    if (choices.indexOf(DEFAULT_REALMLIST) < 0) choices.push(DEFAULT_REALMLIST);
    if (current === null) current = state.get("realmlist") || DEFAULT_REALMLIST;
    return { choices: choices, current: current };
}

/* Comment-preserving realm switch; previous active lines stay as choices. */
function setRealmlist(host) {
    var path = realmlistPath();
    if (path === null) throw new Error("no locale folder found under Data/");
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
    setConfigValue("realmList", host);
}
