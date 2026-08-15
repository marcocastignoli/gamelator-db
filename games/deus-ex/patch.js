"use strict";
/*
 * deus-ex provisioning — Unreal Engine 1 game with the exe (and every config
 * file) under System/, all inside the game folder and therefore inside the
 * jail. The stock GOG GOTY build ships only the original 2000-era renderers;
 * its default "Direct3D" device speaks D3D7 — the one API generation DXVK
 * does not cover. So provisioning installs Chris Dohnal's freeware Direct3D 9
 * renderer (an app-side download, sha256-pinned in the manifest) and switches
 * the engine to it, which puts the game on the same DXVK D3D9 path already
 * proven by wow-335a on real devices.
 */

var VERSION = 1;
var INI = "System/DeusEx.ini";

if (!game.exists(INI)) throw new Error(INI + " not found — is this the Deus Ex game folder?");

function set(section, key, value) {
    config.iniSet(INI, section, key, value);
}

if ((state.get("filesVersion") || 0) < VERSION) {
    // D3D9Drv.dll + D3D9Drv.int are flat in the zip; they belong in System/
    // next to the exe, where UE1 looks for render devices.
    game.extractZip(assets.get("d3d9renderer"), "System");
    set("Engine.Engine", "GameRenderDevice", "D3D9Drv.D3D9RenderDevice");

    // Fullscreen at the container's screen size, 32-bit color (the 2000-era
    // default is 16-bit, which bands badly through modern swapchains).
    set("WinDrv.WindowsClient", "FullscreenViewportX", "960");
    set("WinDrv.WindowsClient", "FullscreenViewportY", "432");
    set("WinDrv.WindowsClient", "FullscreenColorBits", "32");

    // UE1 ties game speed to frame rate: uncapped, the whole game fast
    // forwards. The renderer's own limiter plus DXVK_FRAME_RATE=60 in the
    // container env (manifest) belt-and-braces it.
    set("D3D9Drv.D3D9RenderDevice", "FrameRateLimit", "60");

    state.set("filesVersion", VERSION);
    log("deus-ex: D3D9 renderer installed, ini patched");
}

/* No first-login calibration — provisioning is done in one pass. */
"ready";
