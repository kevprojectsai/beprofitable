import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// versión visible en la app = fecha/hora del build en hora de El Salvador (GMT-6)
const buildId = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/El_Salvador",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date()).replace(",", "");

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
