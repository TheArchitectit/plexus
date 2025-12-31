import { file, write } from "bun";
import { cp, mkdir, rm } from "fs/promises";
import path from "path";

const OUT_DIR = "./dist";
const ENTRY_POINT = "./src/main.tsx";

// Clean output directory
await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

// Build the application
const result = await Bun.build({
  entrypoints: [ENTRY_POINT],
  outdir: OUT_DIR,
  minify: true,
  sourcemap: "external",
  naming: "[name].[ext]", // Keep filenames predictable
});

if (!result.success) {
  console.error("Build failed");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Copy public assets
const publicDir = "./public";
// Check if public dir exists
const publicExists = await file(publicDir).exists();
if (publicExists) {
    // We can't use fs.cp directly on the directory easily in all node versions or via Bun specific API easily yet for recursive copy without shell? 
    // Actually Node 16+ has fs.cp
    await cp(publicDir, OUT_DIR, { recursive: true });
}

// Handle index.html
// We need to inject the script and css
let html = await file("./index.html").text();

// Replace the script tag
// Old: <script type="module" src="/src/main.tsx"></script>
// New: <script type="module" src="/main.js"></script>
html = html.replace(
  /<script type="module" src="\/src\/main.tsx"><\/script>/,
  '<script type="module" src="/main.js"></script>'
);

// Check if a CSS file was generated
const cssFile = result.outputs.find(output => output.path.endsWith(".css"));
if (cssFile) {
    // Inject link tag before </head>
    const cssName = path.basename(cssFile.path);
    html = html.replace(
        /Â­\/headÂ­>/,
        `<link rel="stylesheet" href="/${cssName}">\n  </head>`
    );
}

await write(path.join(OUT_DIR, "index.html"), html);

console.log(`Build complete! Output in ${OUT_DIR}`);
