"use strict";
/*
 * deus-ex settings functions, called by the app's generic settings renderer.
 * Only defines functions — evaluating this file has no side effects.
 * Everything lives in System/DeusEx.ini (UE1 keeps config next to the exe,
 * inside the game folder), so changes stick at any point.
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

function getResolution() {
    requireIni();
    var w = config.iniGet(INI, "WinDrv.WindowsClient", "FullscreenViewportX");
    var h = config.iniGet(INI, "WinDrv.WindowsClient", "FullscreenViewportY");
    return { choices: [], current: (w !== null && h !== null) ? (w + "x" + h) : null };
}

function setResolution(value) {
    requireIni();
    var m = /^([0-9]+)x([0-9]+)$/.exec(value.trim());
    if (m === null) throw new Error("resolution must look like 960x432");
    config.iniSet(INI, "WinDrv.WindowsClient", "FullscreenViewportX", m[1]);
    config.iniSet(INI, "WinDrv.WindowsClient", "FullscreenViewportY", m[2]);
    state.set("resolution", m[1] + "x" + m[2]);
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
            return;
        }
    }
    throw new Error("unknown renderer: " + name);
}
