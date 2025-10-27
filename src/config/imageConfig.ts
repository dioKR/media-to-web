import {
  QUALITY_PRESETS,
  IMAGE_OUTPUT_FORMATS,
  type ImageConfig,
  type ImageFormat,
} from "./types.js";

// 이미지 품질 프리셋
export const IMAGE_QUALITY_PRESETS = {
  [QUALITY_PRESETS.IMAGE.HIGH]: {
    quality: 90,
    format: IMAGE_OUTPUT_FORMATS.WEBP,
  },
  [QUALITY_PRESETS.IMAGE.MEDIUM]: {
    quality: 80,
    format: IMAGE_OUTPUT_FORMATS.WEBP,
  },
  [QUALITY_PRESETS.IMAGE.LOW]: {
    quality: 60,
    format: IMAGE_OUTPUT_FORMATS.WEBP,
  },
};

// 고급 이미지 설정 기본값
export const DEFAULT_ADVANCED_IMAGE_CONFIG = {
  quality: 80,
  format: IMAGE_OUTPUT_FORMATS.WEBP,
  compressionLevel: 6,
  lossless: false,
  nearLossless: false,
  smartSubsample: true,
};

// 이미지 품질 검증
export function validateImageQuality(quality: number): boolean {
  return quality >= 0 && quality <= 100;
}

// 이미지 포맷 검증
export function validateImageFormat(format: string): boolean {
  return Object.values(IMAGE_OUTPUT_FORMATS).includes(format as ImageFormat);
}

// 이미지 설정 생성
export function createImageConfig(
  quality: number,
  format: ImageFormat = IMAGE_OUTPUT_FORMATS.WEBP,
  advanced: Partial<ImageConfig> = {}
): ImageConfig {
  const config: ImageConfig = {
    ...DEFAULT_ADVANCED_IMAGE_CONFIG,
    quality: quality || DEFAULT_ADVANCED_IMAGE_CONFIG.quality,
    format: format || DEFAULT_ADVANCED_IMAGE_CONFIG.format,
    ...advanced,
  };

  if (!validateImageQuality(config.quality)) {
    throw new Error("Image quality must be between 0 and 100");
  }

  if (!validateImageFormat(config.format)) {
    throw new Error(`Unsupported image format: ${config.format}`);
  }

  return config;
}

// Sharp 옵션 생성
export function createSharpOptions(
  config: ImageConfig
): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  if (config.format === IMAGE_OUTPUT_FORMATS.WEBP) {
    options.webp = {
      quality: config.quality,
      lossless: config.lossless,
      nearLossless: config.nearLossless,
      smartSubsample: config.smartSubsample,
    };
  } else if (config.format === IMAGE_OUTPUT_FORMATS.AVIF) {
    options.avif = {
      quality: config.quality,
      lossless: config.lossless,
    };
  }

  return options;
}
