"use strict";
/*
 * fallout3 settings functions, called by the app's generic settings renderer.
 * Only defines functions — evaluating this file has no side effects.
 *
 * The game runs with bUseMyGamesDirectory=0 (patch.js), so after the first
 * launch its live FALLOUT.INI sits in the game folder; before that only
 * Fallout_default.ini exists. Reads prefer the live file, writes go to every
 * file present, so a change made at any point sticks.
 */

var LIVE = "FALLOUT.INI";
var DEFAULTS = "Fallout_default.ini";

function iniFiles() {
    var files = [];
    if (game.exists(LIVE)) files.push(LIVE);
    if (game.exists(DEFAULTS)) files.push(DEFAULTS);
    if (files.length === 0) throw new Error("no Fallout ini found — is this the Fallout 3 game folder?");
    return files;
}

function iniSetAll(section, key, value) {
    var files = iniFiles();
    for (var i = 0; i < files.length; i++) config.iniSet(files[i], section, key, value);
}

function getResolution() {
    var f = iniFiles()[0];
    var w = config.iniGet(f, "Display", "iSize W");
    var h = config.iniGet(f, "Display", "iSize H");
    return { choices: [], current: (w !== null && h !== null) ? (w + "x" + h) : null };
}

function setResolution(value) {
    var m = /^([0-9]+)x([0-9]+)$/.exec(value.trim());
    if (m === null) throw new Error("resolution must look like 960x432");
    iniSetAll("Display", "iSize W", m[1]);
    iniSetAll("Display", "iSize H", m[2]);
    state.set("resolution", m[1] + "x" + m[2]);
}

/* Toggle contract: current/apply values are "1" (skip) or "0" (play). */
function getSkipIntro() {
    var v = config.iniGet(iniFiles()[0], "General", "SIntroSequence");
    return { choices: [], current: (v === null || v === "") ? "1" : "0" };
}

function setSkipIntro(value) {
    if (value === "1") {
        // Remember what we are blanking so "0" can bring it back.
        var current = config.iniGet(iniFiles()[0], "General", "SIntroSequence");
        if (current !== null && current !== "") state.set("introSequence", current);
        iniSetAll("General", "SIntroSequence", "");
    } else {
        var original = state.get("introSequence");
        if (original !== null && original !== "")
            iniSetAll("General", "SIntroSequence", original);
    }
}
