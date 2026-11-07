// Builds the whole app into one HTML file (used for the shareable demo link).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({ plugins: [react(), viteSingleFile()], build: { outDir: "dist-demo" } });
