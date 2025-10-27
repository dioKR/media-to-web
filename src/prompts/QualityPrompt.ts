import type { ImageConfig, VideoConfig } from "../config/types.js";
import { createImageConfig } from "../config/imageConfig.js";
import {
  createVideoConfig,
  VIDEO_QUALITY_PRESETS_LEGACY,
  VIDEO_QUALITY_PRESETS_EXTENDED,
  VIDEO_QUALITY_PRESETS,
} from "../config/videoConfig.js";

export class QualityPrompt {
  /**
   * 품질 설정을 처리합니다.
   */
  public async prompt(
    convertType: "image" | "video",
    mode: "simple" | "advanced"
  ): Promise<{ quality: string; advancedConfig?: ImageConfig | VideoConfig }> {
    if (mode === "simple") {
      return await this.promptSimpleQuality(convertType);
    } else {
      return await this.promptAdvancedQuality(convertType);
    }
  }

  /**
   * 간단한 품질 설정을 프롬프트합니다.
   */
  private async promptSimpleQuality(
    convertType: "image" | "video"
  ): Promise<{ quality: string; advancedConfig?: undefined }> {
    const inquirer = await import("inquirer");

    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "quality",
          message: "Select conversion quality:",
          choices: [
            { name: "High - Best quality, larger file size", value: "high" },
            { name: "Medium - Recommended", value: "medium" },
            { name: "Low - Smallest file size, lower quality", value: "low" },
            new inquirer.default.Separator(),
            { name: "← Back to file selection", value: "__back__" },
          ],
        },
      ]);

      if (result.quality === "__back__") {
        throw new Error("__back__");
      } else {
        return { quality: result.quality };
      }
    }
  }

  /**
   * 고급 품질 설정을 프롬프트합니다.
   */
  private async promptAdvancedQuality(
    convertType: "image" | "video"
  ): Promise<{ quality: string; advancedConfig: ImageConfig | VideoConfig }> {
    if (convertType === "image") {
      const advancedConfig = await this.promptAdvancedImageConfig();
      return { quality: "advanced", advancedConfig };
    } else {
      const advancedConfig = await this.promptAdvancedVideoConfig();
      return { quality: "advanced", advancedConfig };
    }
  }

  /**
   * 고급 이미지 설정 프롬프트
   */
  private async promptAdvancedImageConfig(): Promise<ImageConfig> {
    const inquirer = await import("inquirer");

    let quality;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "input",
          name: "quality",
          message: "Image quality (0-100):",
          default: "80",
          validate: (input: string) => {
            if (input === "__back__") {
              return true; // 뒤로가기는 유효한 입력
            }
            const quality = parseInt(input);
            if (isNaN(quality) || quality < 0 || quality > 100) {
              return "Please enter a number between 0 and 100";
            }
            return true;
          },
        },
      ]);

      if (result.quality === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        quality = parseInt(result.quality);
        break;
      }
    }

    let format;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "format",
          message: "Output format:",
          choices: [
            { name: "WebP (recommended)", value: "webp" },
            { name: "AVIF (newer, smaller)", value: "avif" },
            new inquirer.default.Separator(),
            { name: "← Back to quality input", value: "__back__" },
          ],
          default: "webp",
        },
      ]);

      if (result.format === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        format = result.format;
        break;
      }
    }

    return createImageConfig(quality, format);
  }

  /**
   * 고급 비디오 설정 프롬프트
   */
  private async promptAdvancedVideoConfig(): Promise<VideoConfig> {
    const inquirer = await import("inquirer");

    // 프리셋 선택 또는 수동 설정
    const presetChoice = await inquirer.default.prompt([
      {
        type: "list",
        name: "presetType",
        message: "Choose configuration method:",
        choices: [
          { name: "🎯 Use preset (recommended)", value: "preset" },
          { name: "⚙️  Manual configuration", value: "manual" },
        ],
      },
    ]);

    if (presetChoice.presetType === "preset") {
      // 프리셋 선택
      const presetOptions = [
        { name: "🚀 Ultra Fast (최고 속도)", value: "ULTRA_FAST" },
        { name: "⚖️  Balanced (균형)", value: "BALANCED" },
        { name: "🎬 High Quality H.264 (고품질)", value: "HIGH_QUALITY_H264" },
        { name: "🌐 Web Optimized (웹 최적화)", value: "WEB_OPTIMIZED" },
        { name: "📦 Archive (아카이브용)", value: "ARCHIVE" },
        new inquirer.default.Separator(),
        { name: "🔙 Legacy WebM Presets", value: "legacy" },
      ];

      const selectedPreset = await inquirer.default.prompt([
        {
          type: "list",
          name: "preset",
          message: "Select video preset:",
          choices: presetOptions,
        },
      ]);

      if (selectedPreset.preset === "legacy") {
        // 레거시 WebM 프리셋
        const legacyPresets = [
          { name: "🏆 High Quality WebM (최고 품질)", value: "HIGH_QUALITY" },
          {
            name: "⚖️  Medium Quality WebM (중간 품질)",
            value: "MEDIUM_QUALITY",
          },
          { name: "⚡ Low Quality WebM (빠름)", value: "LOW_QUALITY" },
        ];

        const legacyChoice = await inquirer.default.prompt([
          {
            type: "list",
            name: "legacyPreset",
            message: "Select legacy WebM preset:",
            choices: legacyPresets,
          },
        ]);

        const preset =
          VIDEO_QUALITY_PRESETS_LEGACY[
            legacyChoice.legacyPreset as keyof typeof VIDEO_QUALITY_PRESETS_LEGACY
          ];
        return createVideoConfig(preset.crf, preset.preset, preset.codec);
      } else {
        // 확장 프리셋
        const preset =
          VIDEO_QUALITY_PRESETS_EXTENDED[
            selectedPreset.preset as keyof typeof VIDEO_QUALITY_PRESETS_EXTENDED
          ];
        return createVideoConfig(preset.crf, preset.preset, preset.codec);
      }
    }

    // 수동 설정
    let crf;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "input",
          name: "crf",
          message: "CRF value (0-51, lower = better quality):",
          default: "28",
          validate: (input: string) => {
            if (input === "__back__") {
              return true; // 뒤로가기는 유효한 입력
            }
            const crf = parseInt(input);
            if (isNaN(crf) || crf < 0 || crf > 51) {
              return "Please enter a number between 0 and 51";
            }
            return true;
          },
        },
      ]);

      if (result.crf === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        crf = parseInt(result.crf);
        break;
      }
    }

    let preset;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "preset",
          message: "Encoding preset:",
          choices: [
            { name: "ultrafast (fastest)", value: "ultrafast" },
            { name: "superfast", value: "superfast" },
            { name: "veryfast", value: "veryfast" },
            { name: "faster", value: "faster" },
            { name: "fast", value: "fast" },
            { name: "medium (recommended)", value: "medium" },
            { name: "slow", value: "slow" },
            { name: "slower", value: "slower" },
            { name: "veryslow (best quality)", value: "veryslow" },
            new inquirer.default.Separator(),
            { name: "← Back to CRF input", value: "__back__" },
          ],
          default: "medium",
        },
      ]);

      if (result.preset === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        preset = result.preset;
        break;
      }
    }

    let codec;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "codec",
          message: "Video codec:",
          choices: [
            { name: "libx264 (H.264, recommended)", value: "libx264" },
            { name: "libvpx-vp9 (WebM, high quality)", value: "libvpx-vp9" },
            { name: "libx265 (HEVC, high compression)", value: "libx265" },
            new inquirer.default.Separator(),
            { name: "← Back to preset selection", value: "__back__" },
          ],
          default: "libx264",
        },
      ]);

      if (result.codec === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        codec = result.codec;
        break;
      }
    }

    let format;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "format",
          message: "Output format:",
          choices: [
            { name: "MP4 (recommended)", value: "mp4" },
            { name: "WebM", value: "webm" },
            new inquirer.default.Separator(),
            { name: "← Back to codec selection", value: "__back__" },
          ],
          default: "mp4",
        },
      ]);

      if (result.format === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        format = result.format;
        break;
      }
    }

    let audioCodec;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "audioCodec",
          message: "Audio codec:",
          choices: [
            { name: "aac (recommended)", value: "aac" },
            { name: "libopus", value: "libopus" },
            new inquirer.default.Separator(),
            { name: "← Back to format selection", value: "__back__" },
          ],
          default: "aac",
        },
      ]);

      if (result.audioCodec === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        audioCodec = result.audioCodec;
        break;
      }
    }

    let audioBitrate;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "input",
          name: "audioBitrate",
          message: "Audio bitrate (e.g., 128k, 192k):",
          default: "128k",
          validate: (input: string) => {
            if (input === "__back__") {
              return true; // 뒤로가기 신호
            }
            if (!input.trim()) {
              return "Please enter an audio bitrate.";
            }
            return true;
          },
        },
      ]);

      if (result.audioBitrate === "__back__") {
        throw new Error("__back__"); // 뒤로가기 신호
      } else {
        audioBitrate = result.audioBitrate;
        break;
      }
    }

    return createVideoConfig(crf, preset, codec, {
      format,
      audioCodec,
      audioBitrate,
    });
  }
}
