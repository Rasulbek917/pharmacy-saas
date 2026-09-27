import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16A34A",
          hover: "#15803D",
          light: "#DCFCE7",
          50: "#F0FDF4",
          100: "#DCFCE7",
          500: "#16A34A",
          600: "#15803D",
          700: "#166534",
        },
        navy: {
          DEFAULT: "#0F172A",
          sidebar: "#0F172A",
          hover: "#1E293B",
          dark: "#020617",
          light: "#334155",
        },
        surface: {
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#334155",
          muted: "#64748B",
        },
        status: {
          success: "#16A34A",
          warning: "#EAB308",
          error: "#DC2626",
          info: "#2563EB",
        }
      },
    },
  },
  plugins: [],
};
export default config;
