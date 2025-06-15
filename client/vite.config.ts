import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import jotaiDebugLabel from "jotai/babel/plugin-debug-label";
import jotaiReactRefresh from "jotai/babel/plugin-react-refresh";

// https://vite.dev/config/
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        math: "always",
      },
    },
  },
  resolve: {
    alias: {
      "../../theme.config": __dirname + "/src/semantic-ui/theme.config",
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [jotaiDebugLabel, jotaiReactRefresh],
      },
    }),
  ],
});
