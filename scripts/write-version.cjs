// scripts/write-version.cjs
// Genera archivos de version para el build de Expo web.
//
// Se ejecuta DOS VECES durante el build:
//   1. ANTES de `expo export`: genera version, la guarda en .build-version,
//      escribe src/generated/appVersion.ts (embebida en el bundle) y
//      public/version.json (para que Expo la copie al dist).
//   2. DESPUES de `expo export`: lee .build-version para mantener la MISMA
//      version y escribe dist/version.json explicitamente (garantia extra).
//
// Si se ejecuta de forma standalone, genera version nueva.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const pkg = require("../package.json");
const projectRoot = path.resolve(__dirname, "..");
const sentinelPath = path.join(projectRoot, ".build-version");

function loadOrGenerateVersion() {
  if (fs.existsSync(sentinelPath)) {
    try {
      const data = JSON.parse(
        fs.readFileSync(sentinelPath, "utf8").trim()
      );
      if (data && data.APP_VERSION) {
        console.log(
          `[write-version] Reusando version de .build-version: ${data.APP_VERSION}`
        );
        return data;
      }
    } catch (e) {
      console.warn(
        "[write-version] No se pudo leer .build-version, generando nueva."
      );
    }
  }

  const buildTimestamp = new Date().toISOString();
  const shortHash = crypto
    .createHash("sha1")
    .update(buildTimestamp + Math.random().toString(36))
    .digest("hex")
    .slice(0, 8);
  const APP_VERSION = `${pkg.version}-${shortHash}`;

  const data = { APP_VERSION, buildTimestamp, shortHash };
  try {
    fs.writeFileSync(
      sentinelPath,
      JSON.stringify(data, null, 2) + "\n",
      "utf8"
    );
    console.log(
      `[write-version] Generada version nueva: ${APP_VERSION} (guardada en .build-version)`
    );
  } catch (e) {
    /* noop */
  }
  return data;
}

const { APP_VERSION, buildTimestamp, shortHash } = loadOrGenerateVersion();

const payload = JSON.stringify(
  {
    version: APP_VERSION,
    buildTimestamp,
    shortHash,
  },
  null,
  2
);

// 1. public/ -> Expo copia su contenido al dist/ automaticamente.
const publicDir = path.join(projectRoot, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(
  path.join(publicDir, "version.json"),
  payload,
  "utf8"
);
console.log(`[write-version] public/version.json -> ${APP_VERSION}`);

// 2. dist/ explicitamente (si el dir ya existe, es decir, post-export).
const distDir = path.join(projectRoot, "dist");
if (fs.existsSync(distDir)) {
  fs.writeFileSync(
    path.join(distDir, "version.json"),
    payload,
    "utf8"
  );
  console.log(`[write-version] dist/version.json -> ${APP_VERSION}`);
  // Limpiamos el sentinel solo despues del paso post-export.
  try {
    fs.rmSync(sentinelPath, { force: true });
    console.log(`[write-version] Removido .build-version`);
  } catch (e) {
    /* noop */
  }
}

// 3. Version embebida en el codigo (para comparar en runtime).
const runtimeVersionDir = path.join(projectRoot, "src", "generated");
if (!fs.existsSync(runtimeVersionDir)) {
  fs.mkdirSync(runtimeVersionDir, { recursive: true });
}
fs.writeFileSync(
  path.join(runtimeVersionDir, "appVersion.ts"),
  `// AUTOGENERADO por scripts/write-version.cjs. No editar a mano.
export const APP_VERSION = ${JSON.stringify(APP_VERSION)};
export const BUILD_TIMESTAMP = ${JSON.stringify(buildTimestamp)};
export const BUILD_SHORT_HASH = ${JSON.stringify(shortHash)};
`,
  "utf8"
);
console.log(`[write-version] src/generated/appVersion.ts escrito`);
