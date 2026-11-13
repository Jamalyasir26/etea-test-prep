// Stage 4A (PWA) tests: manifest + icons + hand-written service
// worker + install/offline/update UI wiring. Plain node, no
// dependencies; source-level assertions (the repo's suites cannot
// mount React or run a browser — SW registration and the offline
// round-trip are verified on the local prod server + the live browser
// check; see VERIFY-stage4a-pwa.md §5 for what could NOT be verified
// locally). Run: node scripts/test-stage4a-pwa.mjs (exit 0 = all pass)
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(join(ROOT, p));

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --------------------------------- §1 manifest
check("4A manifest file exists", exists("public/manifest.webmanifest"));
const manifest = JSON.parse(read("public/manifest.webmanifest"));
check("4A manifest name", manifest.name === "ETEA Prep Library", manifest.name);
check("4A manifest short_name", manifest.short_name === "ETEA Prep", manifest.short_name);
check("4A manifest start_url + scope root", manifest.start_url === "/" && manifest.scope === "/");
check("4A manifest display standalone", manifest.display === "standalone", manifest.display);
const css = read("src/app/globals.css");
check(
  "4A manifest theme_color matches the site brand teal",
  manifest.theme_color === "#09555E" && css.includes("--color-brand-teal: #09555e"),
  manifest.theme_color,
);
check(
  "4A manifest background_color matches the site paper",
  manifest.background_color === "#FDFBF1" && css.includes("--color-brand-paper: #fdfbf1"),
  manifest.background_color,
);
const icons = manifest.icons || [];
const bySize = (sizes, purpose) =>
  icons.find((i) => i.sizes === sizes && (purpose ? i.purpose === purpose : !i.purpose));
check("4A manifest has a 192px icon", !!bySize("192x192") && bySize("192x192").type === "image/png");
check("4A manifest has a 512px icon", !!bySize("512x512") && bySize("512x512").type === "image/png");
check(
  "4A manifest has a maskable 512px icon",
  !!bySize("512x512", "maskable") && bySize("512x512", "maskable").type === "image/png",
);
check(
  "4A manifest icon paths are same-origin public files",
  icons.every((i) => i.src.startsWith("/icons/") && exists(`public${i.src}`)),
);
check(
  "4A manifest has no Pakhtunkhwa Insider branding",
  !JSON.stringify(manifest).includes("Pakhtunkhwa") && !JSON.stringify(manifest).includes("Insider"),
);

// --------------------------------- §2 icons (PNG validity + dimensions)
function pngSize(p) {
  const b = fs.readFileSync(join(ROOT, p));
  const magic = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  return { magic, width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
}
for (const [file, w, h] of [
  ["public/icons/icon-192.png", 192, 192],
  ["public/icons/icon-512.png", 512, 512],
  ["public/icons/icon-maskable-512.png", 512, 512],
]) {
  const s = pngSize(file);
  check(`${file} is a valid non-empty PNG`, s.magic && s.bytes > 1024, `${s.bytes} bytes`);
  check(`${file} is ${w}x${h}`, s.width === w && s.height === h, `${s.width}x${s.height}`);
}
check(
  "4A maskable icon differs from the regular 512 (safe-zone artwork)",
  !fs.readFileSync(join(ROOT, "public/icons/icon-maskable-512.png")).equals(fs.readFileSync(join(ROOT, "public/icons/icon-512.png"))),
);

// --------------------------------- §3 service worker
check("4A service worker exists at public/sw.js", exists("public/sw.js"));
const sw = read("public/sw.js");
const version = sw.match(/CACHE_VERSION = "(etea-prep-v\d+)"/);
check("4A SW has a versioned cache name", !!version, version && version[1]);
const STATIC_ROUTES = [
  "/",
  "/analysis",
  "/flashcards",
  "/issues",
  "/library",
  "/links",
  "/mock",
  "/plan",
  "/practice",
  "/review",
  "/topics",
  "/tracks",
  "/tutor",
  "/vacancies",
];
const precacheBlock = sw.slice(sw.indexOf("PRECACHE_URLS"), sw.indexOf("];", sw.indexOf("PRECACHE_URLS")));
for (const r of STATIC_ROUTES) {
  check(`4A SW precaches route ${r}`, precacheBlock.includes(`"${r}"`));
}
check("4A SW precaches the manifest", precacheBlock.includes('"/manifest.webmanifest"'));
check(
  "4A SW precaches all three icons",
  precacheBlock.includes('"/icons/icon-192.png"') &&
    precacheBlock.includes('"/icons/icon-512.png"') &&
    precacheBlock.includes('"/icons/icon-maskable-512.png"'),
);
check("4A SW excludes /api/* from caching (network-only guard)", sw.includes('url.pathname.startsWith("/api/")') && sw.includes("NETWORK-ONLY"));
check("4A SW cache-first for hashed /_next/static/ assets", sw.includes('url.pathname.startsWith("/_next/static/")') && sw.includes("CACHE-FIRST"));
check("4A SW network-first for navigations", sw.includes('request.mode === "navigate"') && sw.includes("NETWORK-FIRST"));
check("4A SW stale-while-revalidate for other same-origin GETs", sw.includes("STALE-WHILE-REVALIDATE"));
check("4A SW handles the SKIP_WAITING message", sw.includes('event.data.type === "SKIP_WAITING"'));
check(
  "4A SW never force-skips waiting on install (exactly one skipWaiting, in the message handler)",
  (sw.match(/self\.skipWaiting\(\)/g) || []).length === 1 &&
    sw.indexOf("self.skipWaiting()") > sw.indexOf('addEventListener("message"'),
);
check("4A SW claims clients on activate", sw.includes("self.clients.claim()"));
check(
  "4A SW deletes old caches on activate",
  sw.includes("caches.delete(n)") && sw.includes("n !== CACHE_VERSION"),
);
check("4A SW only caches successful same-origin responses", sw.includes("response.ok") && sw.includes('response.type === "basic"'));
check("4A SW has no audio code (PWA-only batch)", !sw.toLowerCase().includes("audio"));

// --------------------------------- §4 data bundling (why chunk caching = data caching)
const dataTs = read("src/lib/data.ts");
check("4A data.ts statically imports content.json", dataTs.includes('import content from "../data/content.json"'));
const BANKS = [
  "arabic", "drawing", "english", "gk", "islamiyat", "it", "maths", "pakstudies",
  "pastpapers", "pastpapers_reworded", "pe", "pedagogy", "science", "socialstudies",
  "tajweed", "urdu",
];
for (const b of BANKS) {
  check(`4A data.ts statically imports bank ${b}.json`, dataTs.includes(`../data/banks/${b}.json`));
}
check(
  "4A drawing_pe.json is never imported (on disk + legacy keys only, not part of the bundle)",
  !dataTs.includes('../data/banks/drawing_pe.json'),
);
check(
  "4A data layer fetches no JSON over the network (all data is bundled)",
  !dataTs.includes("fetch("),
);

// --------------------------------- §5 wiring
const layout = read("src/app/layout.tsx");
check("4A layout links the manifest", layout.includes('manifest: "/manifest.webmanifest"'));
check("4A layout sets iOS web-app metadata", layout.includes("appleWebApp") && layout.includes('title: "ETEA Prep"'));
check("4A layout declares PNG + apple touch icons", layout.includes("/icons/icon-192.png") && layout.includes("/icons/icon-512.png"));
check("4A layout viewport themeColor matches the manifest", layout.includes('themeColor: "#09555E"'));
const shell = read("src/components/AppShell.tsx");
check("4A AppShell wraps the shell in PwaProvider", shell.includes("<PwaProvider>") && shell.includes("</PwaProvider>"));
check("4A AppShell renders the update banner", shell.includes("<PwaUpdateBanner />"));
const topbar = read("src/components/ShellTopbar.tsx");
check("4A topbar renders the offline badge", topbar.includes('t("pwaOfflineBadge")') && topbar.includes("WifiOff") && topbar.includes("mounted && !online"));
const sidebar = read("src/components/Sidebar.tsx");
check("4A sidebar renders the install section when expanded", sidebar.includes("{!collapsed && <PwaInstall />}"));
const tutor = read("src/app/tutor/page.tsx");
check("4A tutor shows a needs-internet state when offline", tutor.includes('t("pwaOfflineTutor")') && tutor.includes("mounted && !online"));
const provider = read("src/components/PwaProvider.tsx");
check("4A provider registers /sw.js", provider.includes('navigator.serviceWorker.register("/sw.js")'));
check("4A provider captures beforeinstallprompt", provider.includes('addEventListener("beforeinstallprompt"') && provider.includes("e.preventDefault()"));
check("4A provider detects standalone mode", provider.includes('matchMedia("(display-mode: standalone)")') && provider.includes("standalone"));
check("4A provider detects iOS for the home-screen hint", provider.includes("iphone|ipad|ipod"));
check("4A provider persists the install dismissal", provider.includes("etea_pwa_install_dismissed") && provider.includes('safeWrite(INSTALL_DISMISSED_KEY, "1")'));
check("4A provider posts SKIP_WAITING only on user action", provider.includes('postMessage({ type: "SKIP_WAITING" })'));
check("4A provider reloads only after its own skipWaiting", provider.includes("updatingRef"));
check("4A provider tracks waiting workers", provider.includes("updatefound") && provider.includes("reg.waiting"));
const install = read("src/components/PwaInstall.tsx");
check("4A install section renders nothing without an install path", install.includes("if (!mounted || (!canInstall && !showIosHint)) return null;"));
check("4A install section has a dismiss control", install.includes("dismissInstall") && install.includes('t("pwaInstallDismiss")'));
check("4A install section shows the iOS hint when applicable", install.includes('t("pwaIosHint")'));
const i18n = read("src/lib/i18n.tsx");
for (const key of [
  "pwaInstallTitle", "pwaInstallBody", "pwaInstallButton", "pwaInstallDismiss", "pwaIosHint",
  "pwaOfflineBadge", "pwaOfflineTutor", "pwaUpdateAvailable", "pwaUpdateRefresh", "pwaUpdateDismiss",
]) {
  check(`4A i18n key ${key} exists`, i18n.includes(`${key}:`));
}
const nextConfig = read("next.config.mjs");
check("4A next.config serves /sw.js no-store", nextConfig.includes('source: "/sw.js"') && nextConfig.includes('value: "no-store"'));

// --------------------------------- §6 scope guards
const pkg = JSON.parse(read("package.json"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
check("4A no next-pwa dependency", !("next-pwa" in deps) && !("@ducanh2912/next-pwa" in deps));
check("4A no Serwist / Workbox dependency", !("serwist" in deps) && !("workbox-webpack-plugin" in deps) && !sw.includes("serwist"));
check("4A SW is hand-written (no precache-manifest injection marker)", !sw.includes("self.__WB_MANIFEST") && !sw.includes("__SW_MANIFEST"));

if (failures > 0) {
  console.log(`\n${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log("\nAll Stage 4A PWA checks passed");
}
