/** Robot-side vision codegen targets Java TeamCode only (Kotlin OpModes are out of scope). */
export const VISION_CODEGEN_LANGUAGE = "java" as const;

export type VisionCodegenLanguage = typeof VISION_CODEGEN_LANGUAGE;

export const DEFAULT_VISION_CODEGEN_PACKAGE = "org.firstinspires.ftc.teamcode.vision";

export const VISION_CODEGEN_GENERATED_MARKER = "FTC Dev Tools generated (VISION-12)";
