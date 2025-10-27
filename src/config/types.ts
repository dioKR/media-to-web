// 공통 타입 정의

export const QUALITY_PRESETS = {
  IMAGE: {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  },
  VIDEO: {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  },
};

export const CONVERSION_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
};

export const MODES = {
  SIMPLE: "simple",
  ADVANCED: "advanced",
};

export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
export const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];

export const IMAGE_OUTPUT_FORMATS = {
  WEBP: "webp",
  AVIF: "avif",
} as const;

export const VIDEO_OUTPUT_FORMATS = {
  WEBM: "webm",
  MP4: "mp4",
} as const;

// Type definitions
export type ConversionType =
  | typeof CONVERSION_TYPES.IMAGE
  | typeof CONVERSION_TYPES.VIDEO;
export type Mode = typeof MODES.SIMPLE | typeof MODES.ADVANCED;
export type ConcurrencyLevel =
  | "maximum"
  | "balanced"
  | "light"
  | "custom"
  | number;
export type ImageFormat =
  | typeof IMAGE_OUTPUT_FORMATS.WEBP
  | typeof IMAGE_OUTPUT_FORMATS.AVIF;
export type VideoFormat =
  | typeof VIDEO_OUTPUT_FORMATS.WEBM
  | typeof VIDEO_OUTPUT_FORMATS.MP4;

export interface ConversionConfig {
  convertType: ConversionType;
  inputFolder: string;
  selectedFiles: string[];
  outputFolder: string;
  quality: string;
  mode: Mode;
  advancedConfig?: ImageConfig | VideoConfig;
  concurrency: ConcurrencyLevel;
}

export interface ProgressInfo {
  current: number;
  total: number;
  file: string;
  status: "converting" | "completed" | "failed";
  progress?: number;
  error?: string;
}

export interface ImageConfig {
  quality: number;
  format: ImageFormat;
  lossless?: boolean;
  nearLossless?: boolean;
  smartSubsample?: boolean;
}

export interface VideoConfig {
  crf: number;
  preset: string;
  codec: string;
  bitrate?: string;
  resolution?: string | null;
  fps?: number | null;
  format: VideoFormat;
  audioCodec?: string;
  audioBitrate?: string;
}

export interface GPUInfo {
  available: boolean;
  type: "nvidia" | "amd" | "none";
}

export interface ConversionResult {
  success: Array<{
    input: string;
    output: string;
    inputSize: string;
    outputSize: string;
    reduction: string;
  }>;
  failed: Array<{ file: string; error: string }>;
}
