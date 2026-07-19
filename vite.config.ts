import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

/** Writes public/version.json at build time with the same BUILD_ID used in define. */
function versionJsonPlugin(buildId: string): Plugin {
  return {
    name: "version-json",
    buildStart() {
      const versionPath = path.resolve(__dirname, "public/version.json");
      fs.writeFileSync(versionPath, JSON.stringify({ buildId }));
    },
  };
}

const BUILD_ID = `${Date.now()}`;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionJsonPlugin(BUILD_ID),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
