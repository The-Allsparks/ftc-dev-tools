import { defineConfig } from "vitepress";

const repo = "The-Allsparks/ftc-dev-tools";
const repoUrl = `https://github.com/${repo}`;

export default defineConfig({
  title: "FTC Dev Tools",
  description:
    "Build, deploy, and diagnose FIRST Tech Challenge robot projects from VS Code, Cursor, or the terminal.",
  base: "/ftc-dev-tools/",
  cleanUrls: true,
  lastUpdated: true,
  // Many guides link to repo-root source files on GitHub, not VitePress routes.
  ignoreDeadLinks: [/\.\.\//],
  head: [
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Open+Sans:wght@400;600;700&display=swap",
      },
    ],
  ],
  themeConfig: {
    logo: { text: "FTC Dev Tools" },
    siteTitle: false,
    nav: [
      { text: "Start here", link: "/getting-started" },
      { text: "Troubleshooting", link: "/troubleshooting" },
      { text: "The Allsparks", link: "https://www.theallsparks.org", target: "_blank" },
      { text: "GitHub", link: repoUrl },
      { text: "Releases", link: `${repoUrl}/releases` },
    ],
    sidebar: [
      {
        text: "Start here",
        collapsed: false,
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          {
            text: "Install without Android Studio",
            link: "/install-without-android-studio",
          },
          { text: "CLI install", link: "/cli-install" },
          { text: "Recommended extensions", link: "/recommended-extensions" },
        ],
      },
      {
        text: "Setup by OS",
        items: [
          { text: "Windows", link: "/windows-setup" },
          { text: "macOS", link: "/macos-setup" },
          { text: "Linux", link: "/linux-setup" },
        ],
      },
      {
        text: "Daily workflow",
        items: [
          { text: "Device connections", link: "/device-connections" },
          { text: "Configuration (.ftc-dev.json)", link: "/configuration" },
          { text: "ftc doctor", link: "/doctor" },
          { text: "OpModes", link: "/opmodes" },
          { text: "Robot configuration", link: "/robot-config" },
          { text: "Hardware map", link: "/hwmap" },
          { text: "Snippets", link: "/snippets" },
        ],
      },
      {
        text: "Advanced tooling",
        items: [
          { text: "SDK update", link: "/sdk-update" },
          { text: "Wi‑Fi & wireless ADB", link: "/wifi" },
          { text: "Hub Wi‑Fi manage API", link: "/wifi-manage-api" },
          { text: "Control Hub OS", link: "/hub-update" },
          { text: "Pedro Pathing", link: "/pedro-pathing" },
          { text: "MCP (Cursor agents)", link: "/mcp" },
        ],
      },
      {
        text: "Help & quality",
        items: [
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Feature maturity", link: "/feature-maturity" },
          { text: "Physical device testing", link: "/physical-device-testing" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "Project principles", link: "/project-principles" },
          { text: "Team use", link: "/team-use" },
          { text: "Parity audit", link: "/parity-audit" },
          { text: "Releasing", link: "/releasing" },
          { text: "Branding & publishing", link: "/branding-and-publishing" },
          { text: "Issue labels", link: "/issue-labels" },
          { text: "Telemetry spike", link: "/telemetry-spike" },
          { text: "Debugger spike", link: "/debugger-spike" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: repoUrl }],
    footer: {
      message: "Community-developed FTC tooling. Not affiliated with FIRST or REV.",
      copyright: "Copyright © The Allsparks contributors",
    },
    editLink: {
      pattern: `${repoUrl}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },
  },
});
