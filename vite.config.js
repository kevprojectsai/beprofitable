import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// versión visible en la app = fecha/hora del build (formato corto)
const buildId = new Date()
  .toISOString()
  .slice(0, 16)
  .replace("T", " ");

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
