"use strict";
/*
 * fallout3 provisioning — the plan's "simple ini patch" game (PLAN.md §7 M6).
 *
 * Fallout 3 layers its config: Fallout_default.ini (game folder) is the base,
 * and the FALLOUT.INI the engine writes on first run overrides it. Normally
 * that live ini lands in the Windows profile's My Games — outside the game
 * folder and outside the jail — so this script sets bUseMyGamesDirectory=0,
 * which keeps FALLOUT.INI *and* the Saves/ folder next to the exe. Everything
 * the game mutates then lives in-folder: settings stay patchable after first
 * launch and saves survive app reinstalls, same philosophy as gamelator.json.
 *
 * Provisioning always runs before the first launch in a fresh Gamelator
 * container, so patching the defaults file is enough: the engine generates
 * its live ini from it.
 */

var VERSION = 1;
var INI = "Fallout_default.ini";

if (!game.exists(INI)) throw new Error(INI + " not found — is this the Fallout 3 game folder?");

function set(section, key, value) {
    config.iniSet(INI, section, key, value);
}

if ((state.get("filesVersion") || 0) < VERSION) {
    // Keep the live ini and the saves inside the game folder (see header).
    set("General", "bUseMyGamesDirectory", "0");

    // The classic Gamebryo multi-core freeze fix: without it Fallout 3 hangs
    // at startup or freezes randomly on anything newer than ~2009 — the one
    // ini patch every modern install needs, wine or not.
    set("General", "bUseThreadedAI", "1");
    set("General", "iNumHWThreads", "2");

    // Render at the container's screen size (the in-game menu has no
    // resolution option — that lived in the launcher we bypass).
    set("Display", "iSize W", "960");
    set("Display", "iSize H", "432");

    // Skip the logo/intro movies: faster boots, and video playback is the
    // flakiest part of the emulation stack. The original sequence is kept in
    // state so the "Skip intro videos" setting can restore it.
    if (state.get("introSequence") === null) {
        var intro = config.iniGet(INI, "General", "SIntroSequence");
        state.set("introSequence", intro === null ? "" : intro);
    }
    set("General", "SIntroSequence", "");

    state.set("filesVersion", VERSION);
    log("fallout3: ini defaults patched");
}

/* No first-login calibration here — provisioning is done in one pass. */
"ready";
