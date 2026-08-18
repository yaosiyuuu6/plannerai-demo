import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "dist");

const publishFiles = Object.freeze([
  "index.html",
  "demo/agent-workbench.html",
  "demo/agent-message-queue.html",
  "demo/agent-monitoring-dashboard.html",
  "images/logo.jpg",
]);

const expectedFiles = new Set(publishFiles);
const blockedExtensions = new Set([".xlsx", ".xls", ".docx"]);

async function listFiles(directory, relativeDirectory = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFiles(absolutePath, relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files.sort();
}

function validatePublishedFiles(files) {
  const violations = [];

  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    const segments = normalized.toLowerCase().split("/");
    const extension = path.extname(normalized).toLowerCase();
    const filename = path.posix.basename(normalized);

    if (segments.includes("docs")) violations.push(`${file}: docs directory is blocked`);
    if (blockedExtensions.has(extension)) violations.push(`${file}: office document is blocked`);
    if (filename.startsWith(".~")) violations.push(`${file}: temporary Excel file is blocked`);
    if (!expectedFiles.has(normalized)) violations.push(`${file}: file is not in the publish allowlist`);
  }

  for (const expectedFile of expectedFiles) {
    if (!files.includes(expectedFile)) violations.push(`${expectedFile}: required publish file is missing`);
  }

  if (violations.length > 0) {
    throw new Error(`Unsafe demo publish directory:\n- ${violations.join("\n- ")}`);
  }
}

async function verifyOutput() {
  const files = await listFiles(outputDirectory);
  validatePublishedFiles(files);
  console.log(`Verified dist allowlist (${files.length} files).`);
}

async function build() {
  await rm(outputDirectory, { recursive: true, force: true });

  for (const relativePath of publishFiles) {
    const source = path.join(projectRoot, relativePath);
    const destination = path.join(outputDirectory, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  }

  await verifyOutput();
  console.log(`Demo ready to publish from ${outputDirectory}`);
}

if (process.argv.includes("--verify-only")) {
  await verifyOutput();
} else {
  await build();
}
