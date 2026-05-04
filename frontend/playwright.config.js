import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = __dirname;
const backendDir = path.resolve(__dirname, "../backend_runtime");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\start-playwright-backend.ps1",
      cwd: backendDir,
      url: "http://127.0.0.1:8001/api/products",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --mode playwright --host 127.0.0.1 --port 4174",
      cwd: frontendDir,
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
