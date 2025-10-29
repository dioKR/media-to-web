import type {
  ConversionConfig,
  ImageConfig,
  VideoConfig,
} from "../config/types.js";
import { createImageConfig } from "../config/imageConfig.js";
import {
  createVideoConfig,
  VIDEO_QUALITY_PRESETS,
} from "../config/videoConfig.js";
import { cpus } from "os";

interface ConfigurationData {
  convertType: "image" | "video";
  inputFolder: string;
  selectedFiles: string[];
  outputFolder: string;
  quality: string;
  mode: "simple" | "advanced";
  advancedConfig?: ImageConfig | VideoConfig;
  concurrency: number | "maximum" | "balanced" | "light";
}

export class ConfigurationBuilder {
  /**
   * ConversionConfig를 빌드합니다.
   */
  public build(data: ConfigurationData): ConversionConfig {
    // 설정 검증
    this.validateConfiguration(data);

    return {
      convertType: data.convertType,
      inputFolder: data.inputFolder,
      selectedFiles: data.selectedFiles,
      outputFolder: data.outputFolder,
      quality: data.quality,
      mode: data.mode,
      advancedConfig: data.advancedConfig,
      concurrency: data.concurrency,
    };
  }

  /**
   * 설정을 검증합니다.
   */
  private validateConfiguration(data: ConfigurationData): void {
    if (!data.convertType) {
      throw new Error("Convert type is required");
    }

    if (!data.inputFolder) {
      throw new Error("Input folder is required");
    }

    if (!data.selectedFiles || data.selectedFiles.length === 0) {
      throw new Error("At least one file must be selected");
    }

    if (!data.outputFolder) {
      throw new Error("Output folder is required");
    }

    if (!data.quality) {
      throw new Error("Quality setting is required");
    }

    if (!data.mode) {
      throw new Error("Mode is required");
    }

    if (!data.concurrency) {
      throw new Error("Concurrency setting is required");
    }
  }

  /**
   * 품질 설정을 가져옵니다.
   */
  public static getQualitySettings(
    quality: string,
    convertType: "image" | "video",
    advancedConfig?: ImageConfig | VideoConfig
  ): ImageConfig | VideoConfig {
    if (advancedConfig) {
      return advancedConfig;
    }

    if (convertType === "image") {
      switch (quality) {
        case "high":
          return createImageConfig(80, "webp");
        case "medium":
          return createImageConfig(60, "webp");
        case "low":
          return createImageConfig(40, "webp");
        default:
          return createImageConfig(80, "webp");
      }
    } else {
      // Video
      switch (quality) {
        case "high":
          return createVideoConfig(
            VIDEO_QUALITY_PRESETS.high.crf,
            VIDEO_QUALITY_PRESETS.high.preset,
            VIDEO_QUALITY_PRESETS.high.codec
          );
        case "medium":
          return createVideoConfig(
            VIDEO_QUALITY_PRESETS.medium.crf,
            VIDEO_QUALITY_PRESETS.medium.preset,
            VIDEO_QUALITY_PRESETS.medium.codec
          );
        case "low":
          return createVideoConfig(
            VIDEO_QUALITY_PRESETS.low.crf,
            VIDEO_QUALITY_PRESETS.low.preset,
            VIDEO_QUALITY_PRESETS.low.codec
          );
        default:
          return createVideoConfig(
            VIDEO_QUALITY_PRESETS.medium.crf,
            VIDEO_QUALITY_PRESETS.medium.preset,
            VIDEO_QUALITY_PRESETS.medium.codec
          );
      }
    }
  }

  /**
   * 동시성 레벨을 가져옵니다.
   */
  public static getConcurrencyLevel(
    concurrency: number | "maximum" | "balanced" | "light",
    convertType: "image" | "video"
  ): number {
    if (typeof concurrency === "number") {
      return concurrency;
    }

    const numCpus = cpus().length;

    switch (concurrency) {
      case "maximum":
        return numCpus;
      case "balanced":
        return Math.max(1, Math.floor(numCpus / 2));
      case "light":
        return Math.max(1, Math.floor(numCpus / 4));
      default:
        return Math.max(1, Math.floor(numCpus / 2));
    }
  }
}

// Static 함수들을 export
export const getQualitySettings = ConfigurationBuilder.getQualitySettings;
export const getConcurrencyLevel = ConfigurationBuilder.getConcurrencyLevel;
