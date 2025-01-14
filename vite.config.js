import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

import os from "os";
import path from "path";

export default defineConfig({
  plugins: [
    basicSsl({
      name: "alipay",
      certDir: path.join(os.homedir(), ".galacean", "cert"),
      domains: ["*.alipay.net", "*.alipay.com"]
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: '3000'
  },
  resolve: {
    alias: [{ find: /^~/, replacement: "" }],
    mainFields: ["localMain", "module", "jsnext:main", "jsnext"],
    dedupe: ["@galacean/engine", "@galacean/engine-toolkit"]
  },
  optimizeDeps: {
    esbuildOptions: { loader: { ".jsx": "tsx" } },
    exclude: [
      "@galacean/engine",
      "@galacean/engine-toolkit",
    ]
  }
});
