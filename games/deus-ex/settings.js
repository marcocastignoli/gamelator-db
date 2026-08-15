"use strict";
/*
 * deus-ex settings functions, called by the app's generic settings renderer.
 * Only defines functions — evaluating this file has no side effects.
 * Everything lives in System/DeusEx.ini (UE1 keeps config next to the exe,
 * inside the game folder), so changes stick at any point.
 *
 * Writers also record the choice in state, because the engine rewrites that
 * ini behind our back (renderer dialog, in-game video menu); patch.js
 * re-asserts the display block from state before every launch, so state is
 * what actually survives. See the patch.js header.
 */

var INI = "System/DeusEx.ini";

/* Friendly name ↔ UE1 render device class, in menu order. */
var RENDERERS = [
    ["D3D9 (recommended)", "D3D9Drv.D3D9RenderDevice"],
    ["Original Direct3D", "D3DDrv.D3DRenderDevice"],
    ["OpenGL", "OpenGLDrv.OpenGLRenderDevice"]
];

function requireIni() {
    if (!game.exists(INI)) throw new Error(INI + " not found — is this the Deus Ex game folder?");
}

/* The engine keeps a separate size per display mode; both are written so a
   resolution change survives switching between them. */
function viewportPrefix() {
    return String(config.iniGet(INI, "WinDrv.WindowsClient", "StartupFullscreen"))
            .toLowerCase() === "true" ? "Fullscreen" : "Windowed";
}

function getResolution() {
    requireIni();
    var prefix = viewportPrefix();
    var w = config.iniGet(INI, "WinDrv.WindowsClient", prefix + "ViewportX");
    var h = config.iniGet(INI, "WinDrv.WindowsClient", prefix + "ViewportY");
    return { choices: [], current: (w !== null && h !== null) ? (w + "x" + h) : null };
}

function setResolution(value) {
    requireIni();
    var m = /^([0-9]+)x([0-9]+)$/.exec(value.trim());
    if (m === null) throw new Error("resolution must look like 960x432");
    config.iniSet(INI, "WinDrv.WindowsClient", "FullscreenViewportX", m[1]);
    config.iniSet(INI, "WinDrv.WindowsClient", "FullscreenViewportY", m[2]);
    config.iniSet(INI, "WinDrv.WindowsClient", "WindowedViewportX", m[1]);
    config.iniSet(INI, "WinDrv.WindowsClient", "WindowedViewportY", m[2]);
    state.set("resolution", m[1] + "x" + m[2]);
}

/* Windowed is the default: exclusive fullscreen fails its first Present on
   this stack (see patch.js). Winlator's desktop is the container's screen
   size, so windowed at that size fills the screen anyway. */
var DISPLAY_MODES = [
    ["Windowed (recommended)", "windowed"],
    ["Fullscreen", "fullscreen"]
];

function getDisplayMode() {
    requireIni();
    var fullscreen = String(config.iniGet(INI, "WinDrv.WindowsClient", "StartupFullscreen"))
            .toLowerCase() === "true";
    var current = fullscreen ? "fullscreen" : "windowed";
    var choices = [];
    var label = null;
    for (var i = 0; i < DISPLAY_MODES.length; i++) {
        choices.push(DISPLAY_MODES[i][0]);
        if (DISPLAY_MODES[i][1] === current) label = DISPLAY_MODES[i][0];
    }
    return { choices: choices, current: label };
}

function setDisplayMode(name) {
    requireIni();
    for (var i = 0; i < DISPLAY_MODES.length; i++) {
        if (DISPLAY_MODES[i][0] === name) {
            var fullscreen = DISPLAY_MODES[i][1] === "fullscreen";
            config.iniSet(INI, "WinDrv.WindowsClient", "StartupFullscreen",
                    fullscreen ? "True" : "False");
            state.set("displayMode", DISPLAY_MODES[i][1]);
            return;
        }
    }
    throw new Error("unknown display mode: " + name);
}

function getRenderer() {
    requireIni();
    var device = config.iniGet(INI, "Engine.Engine", "GameRenderDevice");
    var choices = [];
    var current = device;
    for (var i = 0; i < RENDERERS.length; i++) {
        choices.push(RENDERERS[i][0]);
        if (RENDERERS[i][1] === device) current = RENDERERS[i][0];
    }
    return { choices: choices, current: current };
}

function setRenderer(name) {
    requireIni();
    for (var i = 0; i < RENDERERS.length; i++) {
        if (RENDERERS[i][0] === name) {
            config.iniSet(INI, "Engine.Engine", "GameRenderDevice", RENDERERS[i][1]);
            state.set("renderer", RENDERERS[i][1]);
            return;
        }
    }
    throw new Error("unknown renderer: " + name);
}
