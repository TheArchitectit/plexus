import { build } from "bun";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { watch } from "fs";

const runBuild = async () => {
    console.log("Building...");

    if (!existsSync("./dist")) {
      await mkdir("./dist");
    }

    const result = await build({
      entrypoints: ["./src/main.tsx"],
      outdir: "./dist",
      minify: process.env.NODE_ENV === "production",
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      },
    });

    if (!result.success) {
      console.error("Build failed");
      for (const log of result.logs) {
        console.error(log);
      }
      return;
    }

    // HTML Injection
    let html = await readFile("index.html", "utf-8");
    html = html.replace('src="./src/main.tsx"', 'src="/main.js"');
    html = html.replace('src="/src/main.tsx"', 'src="/main.js"'); // Handle both absolute/relative
    html = html.replace('type="module"', ''); 

    if (existsSync("dist/main.css")) {
      // Check if link already exists to avoid dupes
      if (!html.includes('href="/main.css"')) {
           html = html.replace('</head>', '  <link rel="stylesheet" href="/main.css">\n  </head>');
      }
    }

    await writeFile("dist/index.html", html);
    console.log("Build complete.");
};

// Initial Build
await runBuild();

// Watch Mode
if (process.argv.includes("--watch")) {
    console.log("Watching for changes in ./src ...");
    watch("./src", { recursive: true }, async (event, filename) => {
        console.log(`Detected change in ${filename}`);
        await runBuild();
    });
}

