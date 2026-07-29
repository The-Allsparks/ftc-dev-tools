/**
 * Command IDs that form the extension-first rookie path (epic #46).
 * Used by CI to ensure palette titles stay registered as onboarding grows.
 */
export const ROOKIE_JOURNEY_COMMAND_IDS = [
  "ftc.startHere",
  "ftc.configureRecommendedExtensions",
  "ftc.setUpComputer",
  "ftc.runDoctor",
  "ftc.obtainProject",
  "ftc.setUpProject",
  "ftc.connectRobotUsb",
  "ftc.firstOpModeJourney",
  "ftc.buildAndDeploy",
  "ftc.viewLogs",
] as const;

/** Child GitHub issues delivered for milestone 0.2 Rookie Onboarding (epic #46). */
export const ONBOARDING_0_2_CHILD_ISSUES = [
  { number: 32, title: "Rookie onboarding wizard (FTC: Start Here)" },
  { number: 35, title: "Guided flow to obtain or open official FTC project" },
  { number: 36, title: "FTC Robot sidebar Getting started section" },
  { number: 37, title: "VS Code walkthroughs for first-time FTC Dev Tools setup" },
  { number: 40, title: "First-run milestone checklist (zero to competition-ready)" },
  { number: 41, title: "Guided Connect My Robot flow (USB first)" },
  { number: 42, title: "First OpMode journey (create, deploy, Driver Station)" },
] as const;

/** Setup follow-ups tracked by meta issue #45 (formerly #13 / #14 gaps). */
export const ONBOARDING_0_1_SETUP_CLOSURE_ISSUES = [
  { number: 30, topic: "Doctor machine vs project split" },
  { number: 31, topic: "JDK major version guidance" },
  { number: 33, topic: "Actionable doctor UI" },
  { number: 34, topic: "Install-deps consent (no silent installs)" },
  { number: 38, topic: "Pedagogical copy" },
  { number: 39, topic: "Real build/deploy tasks in project setup" },
  { number: 43, topic: "Wrong folder detection" },
  { number: 44, topic: "Setup command tests" },
] as const;
