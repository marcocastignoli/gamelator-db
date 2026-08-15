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
 *
 * Two things are learned from a real Pixel 8 run (v1 crashed there):
 *
 * 1. UE1 shows a renderer-selection dialog whenever [FirstRun]FirstRun is
 *    older than the engine version, and whatever the user picks there
 *    OVERWRITES GameRenderDevice — so the ini we so carefully patched was
 *    replaced by D3DDrv (D3D7 + DirectDraw) before the first frame, and the
 *    game died in DirectDraw init. The dialog is suppressed by claiming the
 *    build's own version; the game writes exactly this on a clean exit, and
 *    a crash (like ours) is precisely when it never gets that far.
 * 2. Display config therefore cannot be write-once. The game rewrites it —
 *    from that dialog, from its own in-game video menu, on version changes.
 *    So the *files* are installed once, but the display block is re-asserted
 *    on every provisioning run (i.e. before every launch), derived from the
 *    user's stored choices. State is the source of truth; System/DeusEx.ini
 *    is a derived artifact that the engine is free to trample between runs.
 */

var VERSION = 2;
var INI = "System/DeusEx.ini";

/* GOG/Steam GOTY is v1.112fm; the engine compares this against its own
   version to decide whether to run first-time setup. */
var ENGINE_VERSION = "1112";
var DEFAULT_RENDERER = "D3D9Drv.D3D9RenderDevice";
var DEFAULT_RESOLUTION = "960x432";

if (!game.exists(INI)) throw new Error(INI + " not found — is this the Deus Ex game folder?");

function set(section, key, value) {
    config.iniSet(INI, section, key, value);
}

/* One-time: land D3D9Drv.dll + D3D9Drv.int flat in System/, next to the exe,
   where UE1 looks for render devices. */
if ((state.get("filesVersion") || 0) < VERSION) {
    game.extractZip(assets.get("d3d9renderer"), "System");
    state.set("filesVersion", VERSION);
    log("deus-ex: D3D9 renderer installed");
}

/* Every run: re-derive the display block from the user's stored choices. */
var renderer = state.get("renderer") || DEFAULT_RENDERER;
var resolution = state.get("resolution") || DEFAULT_RESOLUTION;
var size = /^([0-9]+)x([0-9]+)$/.exec(resolution);
if (size === null) size = /^([0-9]+)x([0-9]+)$/.exec(DEFAULT_RESOLUTION);

/* Never let the renderer dialog run: it is the thing that broke v1. */
set("FirstRun", "FirstRun", ENGINE_VERSION);
set("Engine.Engine", "GameRenderDevice", renderer);

/* Fullscreen at the container's screen size, 32-bit colour (the 2000-era
   default is 16-bit, which bands badly through modern swapchains). */
set("WinDrv.WindowsClient", "FullscreenViewportX", size[1]);
set("WinDrv.WindowsClient", "FullscreenViewportY", size[2]);
set("WinDrv.WindowsClient", "FullscreenColorBits", "32");
set("WinDrv.WindowsClient", "WindowedColorBits", "32");
set("WinDrv.WindowsClient", "StartupFullscreen", "True");

/* UE1 ties game speed to frame rate: uncapped, the whole game fast forwards.
   The renderer's own limiter plus DXVK_FRAME_RATE=60 in the container env
   (manifest) belt-and-braces it. */
set("D3D9Drv.D3D9RenderDevice", "FrameRateLimit", "60");

/* No first-login calibration — provisioning is done in one pass. */
"ready";
