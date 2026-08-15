"use strict";
/*
 * deus-ex provisioning — Unreal Engine 1 game with the exe (and every config
 * file) under System/, all inside the game folder and therefore inside the
 * jail. The stock GOG GOTY build ships only the original 2000-era renderers;
 * its default "Direct3D" device speaks D3D7 — the one API generation DXVK
 * does not cover. So provisioning installs Chris Dohnal's freeware Direct3D 9
 * renderer (an app-side download, sha256-pinned in the manifest) and switches
 * the engine to it.
 *
 * Learned from real Pixel 8 runs (Vortek / Mali-G715), in order:
 *
 * 1. UE1 shows a renderer-selection dialog whenever [FirstRun]FirstRun is
 *    older than the engine version, and whatever is picked there OVERWRITES
 *    GameRenderDevice — the ini was replaced by D3DDrv before the first frame
 *    and the game died in DirectDraw init. Suppressed by claiming the build's
 *    own version (what the game writes itself on a clean exit).
 * 2. Display config therefore cannot be write-once: the engine rewrites it
 *    from that dialog and from its own video menu. The files are installed
 *    once, but the display block is re-asserted on every provisioning run,
 *    derived from the user's stored choices. State is the source of truth;
 *    System/DeusEx.ini is a derived artifact the engine may trample.
 * 3. Exclusive fullscreen kills it. UE1 still drives a DirectDraw display
 *    mode change even with a D3D9 render device, and the D3D9 swapchain that
 *    follows fails its first Present — "Assertion failed: swapBuffersStatus
 *    [D3D9.cpp]". Windowed, the same build reaches the menus and level load.
 *    Winlator's desktop is exactly the container's screen size, so windowed
 *    at that size looks identical. Fullscreen stays available as a setting.
 */

var VERSION = 3;
var INI = "System/DeusEx.ini";

/* GOG/Steam GOTY is v1.112fm; the engine compares this against its own
   version to decide whether to run first-time setup. */
var ENGINE_VERSION = "1112";
var DEFAULT_RENDERER = "D3D9Drv.D3D9RenderDevice";
var DEFAULT_RESOLUTION = "960x432";
var DEFAULT_DISPLAY_MODE = "windowed";

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
var displayMode = state.get("displayMode") || DEFAULT_DISPLAY_MODE;
var size = /^([0-9]+)x([0-9]+)$/.exec(resolution);
if (size === null) size = /^([0-9]+)x([0-9]+)$/.exec(DEFAULT_RESOLUTION);

/* Never let the renderer dialog run: it is what broke v1. */
set("FirstRun", "FirstRun", ENGINE_VERSION);
set("Engine.Engine", "GameRenderDevice", renderer);

/* Both viewport pairs carry the chosen size, so switching mode needs no
   second pass; 32-bit colour throughout (the 2000-era default is 16-bit,
   which bands badly through modern swapchains). */
set("WinDrv.WindowsClient", "FullscreenViewportX", size[1]);
set("WinDrv.WindowsClient", "FullscreenViewportY", size[2]);
set("WinDrv.WindowsClient", "FullscreenColorBits", "32");
set("WinDrv.WindowsClient", "WindowedViewportX", size[1]);
set("WinDrv.WindowsClient", "WindowedViewportY", size[2]);
set("WinDrv.WindowsClient", "WindowedColorBits", "32");
set("WinDrv.WindowsClient", "StartupFullscreen",
        displayMode === "fullscreen" ? "True" : "False");

/* UE1 ties game speed to frame rate: uncapped, the whole game fast forwards.
   The renderer's own limiter plus DXVK_FRAME_RATE=60 in the container env
   (manifest) belt-and-braces it. */
set("D3D9Drv.D3D9RenderDevice", "FrameRateLimit", "60");

/* Precaching uploads a level's whole texture set in one burst at load time —
   the point where this stack is least happy. Off, textures upload lazily;
   the only cost is a little hitching the first time each is drawn. */
set("D3D9Drv.D3D9RenderDevice", "UsePrecache", "False");

/* Present without waiting on a vblank the emulated swapchain may never
   report. Frame pacing is handled by FrameRateLimit above. */
set("D3D9Drv.D3D9RenderDevice", "SwapInterval", "0");

/* No first-login calibration — provisioning is done in one pass. */
"ready";
