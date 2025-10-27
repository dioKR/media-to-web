import inquirer from "inquirer";
import path from "path";
import fs from "fs";
import os from "os";
import {
  MODES,
  CONVERSION_TYPES,
  type ConversionConfig,
  type ImageConfig,
  type VideoConfig,
  type ConcurrencyLevel,
} from "./config/types.js";
import { createImageConfig } from "./config/imageConfig.js";
import {
  createVideoConfig,
  VIDEO_QUALITY_PRESETS_LEGACY,
  VIDEO_QUALITY_PRESETS_EXTENDED,
} from "./config/videoConfig.js";

const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];

export async function promptUser(
  inputFolder?: string
): Promise<ConversionConfig> {
  const currentDir = inputFolder || process.cwd();

  // 1. 변환 타입 선택
  let convertType;
  while (true) {
    const result = await inquirer.prompt([
      {
        type: "list",
        name: "convertType",
        message: "What would you like to convert?",
        choices: [
          { name: "🖼️  Images (jpg/png → webp)", value: "image" },
          { name: "🎬 Videos (mp4/mov → webm)", value: "video" },
        ],
      },
    ]);

    if (result.convertType !== "__back__") {
      convertType = result.convertType;
      break;
    }
  }

  // 2. 모드 선택 (Simple/Advanced)
  let mode;
  while (true) {
    const result = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "Select configuration mode:",
        choices: [
          { name: "🔧 Simple Mode - Use presets", value: MODES.SIMPLE },
          { name: "⚙️ Advanced Mode - Custom settings", value: MODES.ADVANCED },
          new inquirer.Separator(),
          { name: "← Back to file type selection", value: "__back__" },
        ],
        default: MODES.SIMPLE,
      },
    ]);

    if (result.mode === "__back__") {
      // 변환 타입 선택으로 돌아가기
      return await promptUser(inputFolder);
    } else {
      mode = result.mode;
      break;
    }
  }

  // 3. 현재 폴더의 파일 목록 가져오기
  const files = getFilesInDirectory(currentDir, convertType);

  if (files.length === 0) {
    throw new Error(
      `No ${
        convertType === "image" ? "image" : "video"
      } files found in the current folder to convert.`
    );
  }

  // 3. 파일 선택 (2단계 방식 - 더 나은 UX)
  let selectionMode;
  while (true) {
    const result = await inquirer.prompt([
      {
        type: "list",
        name: "selectionMode",
        message: "How would you like to select files?",
        choices: [
          { name: "✓ Select all files", value: "all" },
          { name: "📁 Choose individual files", value: "individual" },
          new inquirer.Separator(),
          { name: "← Back to mode selection", value: "__back__" },
        ],
        default: "all",
      },
    ]);

    if (result.selectionMode === "__back__") {
      // 변환 타입 선택으로 돌아가기
      return await promptUser(inputFolder);
    } else {
      selectionMode = result.selectionMode;
      break;
    }
  }

  let selectedFiles;

  if (selectionMode === "all") {
    // 모든 파일 선택
    selectedFiles = {
      files: files.map((file: { name: string; size: number }) => file.name),
    };
  } else {
    // 개별 파일 선택 (체크박스)
    while (true) {
      const fileChoices = [
        new inquirer.Separator("─── File List ───"),
        ...files.map((file: { name: string; size: number }) => ({
          name: `${file.name} ${formatBytes(file.size)}`,
          value: file.name,
          checked: true, // 개별 선택 시에도 기본적으로 모두 선택
        })),
        new inquirer.Separator(),
        { name: "← Back to file selection mode", value: "__back__" },
      ];

      const result = await inquirer.prompt([
        {
          type: "checkbox",
          name: "files",
          message: `${
            convertType === "image" ? "Image" : "Video"
          } files in current folder: (Space to select, Enter to confirm)`,
          choices: fileChoices,
          validate: (answer) => {
            const actualFiles = answer.filter((f: string) => f !== "__back__");
            if (actualFiles.length < 1) {
              return "Please select at least one file.";
            }
            return true;
          },
        },
      ]);

      if (result.files.includes("__back__")) {
        // 파일 선택 방식으로 돌아가기
        return await promptUser(inputFolder);
      } else {
        selectedFiles = {
          files: result.files.filter((f: string) => f !== "__back__"),
        };
        break;
      }
    }
  }

  // 4. 품질 설정 (모드에 따라 다름)
  let quality;
  let advancedConfig = null;

  if (mode === MODES.SIMPLE) {
    // Simple Mode: 프리셋 선택
    while (true) {
      const result = await inquirer.prompt([
        {
          type: "list",
          name: "quality",
          message: "Select conversion quality:",
          choices: [
            { name: "Medium - Recommended", value: "medium" },
            { name: "High", value: "high" },
            { name: "Low", value: "low" },
            new inquirer.Separator(),
            { name: "← Back to file selection", value: "__back__" },
          ],
          default: "medium",
        },
      ]);

      if (result.quality === "__back__") {
        // 파일 선택으로 돌아가기
        return await promptUser(inputFolder);
      } else {
        quality = result.quality;
        break;
      }
    }
  } else {
    // Advanced Mode: 세부 설정 입력
    try {
      if (convertType === CONVERSION_TYPES.IMAGE) {
        advancedConfig = await promptAdvancedImageConfig();
      } else {
        advancedConfig = await promptAdvancedVideoConfig();
      }
      quality = "advanced"; // 고급 모드 표시
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "__back__") {
        // 뒤로가기 신호 - 파일 선택으로 돌아가기
        return await promptUser(inputFolder);
      }
      throw error; // 다른 에러는 그대로 전파
    }
  }

  // 5. CPU 사용률 설정
  let concurrency;
  while (true) {
    const result = await inquirer.prompt([
      {
        type: "list",
        name: "concurrency",
        message: "CPU usage level:",
        choices: [
          { name: "⚡ Maximum - Use all available cores", value: "maximum" },
          { name: "⚖️ Balanced - Recommended (cores/2)", value: "balanced" },
          { name: "🪶 Light - 1-2 concurrent processes", value: "light" },
          { name: "🔧 Custom - Specify number", value: "custom" },
          new inquirer.Separator(),
          { name: "← Back to quality settings", value: "__back__" },
        ],
        default: "balanced",
      },
    ]);

    if (result.concurrency === "__back__") {
      // 품질 설정으로 돌아가기
      return await promptUser(inputFolder);
    } else if (result.concurrency === "custom") {
      // 사용자 정의 동시 처리 수 입력
      const customResult = await inquirer.prompt([
        {
          type: "input",
          name: "customConcurrency",
          message: "Number of concurrent processes (1-8):",
          default: "2",
          validate: (input) => {
            const num = parseInt(input);
            if (isNaN(num) || num < 1 || num > 8) {
              return "Please enter a number between 1 and 8";
            }
            return true;
          },
        },
      ]);
      concurrency = parseInt(customResult.customConcurrency);
      break;
    } else {
      concurrency = result.concurrency;
      break;
    }
  }

  // 6. 출력 폴더 설정
  let outputFolder;
  while (true) {
    // 입력 폴더 기준으로 기본 출력 폴더 설정
    const defaultOutputFolder = path.join(currentDir, "converted");

    const result = await inquirer.prompt([
      {
        type: "input",
        name: "outputFolder",
        message: "Output folder for converted files:",
        default: defaultOutputFolder,
        validate: (input) => {
          if (input === "__back__") {
            return true; // 뒤로가기는 유효한 입력
          }
          if (!input.trim()) {
            return "Please enter an output folder.";
          }
          return true;
        },
      },
    ]);

    if (result.outputFolder === "__back__") {
      // CPU 설정으로 돌아가기
      return await promptUser(inputFolder);
    } else {
      outputFolder = result.outputFolder;
      break;
    }
  }

  // 상대경로인 경우 입력 폴더 기준으로 해석
  const resolvedOutputFolder = path.isAbsolute(outputFolder)
    ? path.resolve(outputFolder)
    : path.resolve(currentDir, outputFolder);

  // 출력 폴더 생성
  if (!fs.existsSync(resolvedOutputFolder)) {
    fs.mkdirSync(resolvedOutputFolder, { recursive: true });
  }

  return {
    convertType,
    inputFolder: currentDir,
    selectedFiles: selectedFiles.files,
    outputFolder: resolvedOutputFolder,
    quality,
    mode,
    advancedConfig: advancedConfig || undefined,
    concurrency,
  };
}

// 고급 이미지 설정 프롬프트
async function promptAdvancedImageConfig(): Promise<ImageConfig> {
  let quality;
  while (true) {
    const result = await inquirer.prompt([
      {
        type: "input",
        name: "quality",
        message: "Image quality (0-100):",
        default: "80",
        validate: (input) => {
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
    const result = await inquirer.prompt([
      {
        type: "list",
        name: "format",
        message: "Output format:",
        choices: [
          { name: "WebP (recommended)", value: "webp" },
          { name: "AVIF (newer, smaller)", value: "avif" },
          new inquirer.Separator(),
          { name: "← Back to quality input", value: "__back__" },
        ],
        default: "webp",
      },
    ]);

    if (result.format === "__back__") {
      // 품질 입력으로 돌아가기
      return await promptAdvancedImageConfig();
    } else {
      format = result.format;
      break;
    }
  }

  return createImageConfig(quality, format);
}

// 고급 비디오 설정 프롬프트
async function promptAdvancedVideoConfig(): Promise<VideoConfig> {
  // 프리셋 선택 또는 수동 설정
  const presetChoice = await inquirer.prompt([
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
      new inquirer.Separator(),
      { name: "🔙 Legacy WebM Presets", value: "legacy" },
    ];

    const selectedPreset = await inquirer.prompt([
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

      const legacyChoice = await inquirer.prompt([
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
    const result = await inquirer.prompt([
      {
        type: "input",
        name: "crf",
        message: "CRF value (0-51, lower = better quality):",
        default: "28",
        validate: (input) => {
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
    const result = await inquirer.prompt([
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
          new inquirer.Separator(),
          { name: "← Back to CRF input", value: "__back__" },
        ],
        default: "medium",
      },
    ]);

    if (result.preset === "__back__") {
      // CRF 입력으로 돌아가기
      return await promptAdvancedVideoConfig();
    } else {
      preset = result.preset;
      break;
    }
  }

  let codec;
  while (true) {
    const result = await inquirer.prompt([
      {
        type: "list",
        name: "codec",
        message: "Video codec:",
        choices: [
          { name: "VP9 (WebM, smaller files)", value: "libvpx-vp9" },
          { name: "H.264 (MP4, compatible)", value: "libx264" },
          { name: "H.265/HEVC (MP4, very efficient)", value: "libx265" },
          new inquirer.Separator(),
          { name: "← Back to preset selection", value: "__back__" },
        ],
        default: "libvpx-vp9",
      },
    ]);

    if (result.codec === "__back__") {
      // 프리셋 선택으로 돌아가기
      return await promptAdvancedVideoConfig();
    } else {
      codec = result.codec;
      break;
    }
  }

  return createVideoConfig(crf, preset, codec);
}

// CPU 사용률 설정을 실제 동시 처리 수로 변환
export function getConcurrencyLevel(
  concurrency: ConcurrencyLevel,
  convertType: string
): number {
  const cpuCores = os.cpus().length;

  switch (concurrency) {
    case "maximum":
      return convertType === "image"
        ? Math.max(1, cpuCores - 1)
        : Math.max(1, Math.floor(cpuCores / 2));
    case "balanced":
      return convertType === "image"
        ? Math.max(1, Math.floor(cpuCores / 2))
        : Math.max(1, Math.floor(cpuCores / 4));
    case "light":
      return 2;
    default:
      // custom 또는 숫자
      return typeof concurrency === "number" ? concurrency : 2;
  }
}

function getFilesInDirectory(
  dirPath: string,
  type: string
): Array<{ name: string; size: number }> {
  const extensions =
    type === "image" ? SUPPORTED_IMAGE_EXTENSIONS : SUPPORTED_VIDEO_EXTENSIONS;

  const allFiles = fs.readdirSync(dirPath);

  return allFiles
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return extensions.includes(ext);
    })
    .map((file: string) => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
      };
    })
    .sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name)
    );
}

function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "(0 B)";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `(${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]})`;
}

export function getQualitySettings(
  quality: string,
  type: string,
  advancedConfig: ImageConfig | VideoConfig | null = null
): ImageConfig | VideoConfig {
  // 고급 모드인 경우 advancedConfig 사용
  if (quality === "advanced" && advancedConfig) {
    return advancedConfig;
  }

  // Simple 모드: 기존 프리셋 사용
  const settings: Record<string, Record<string, any>> = {
    image: {
      high: { quality: 90, format: "webp" },
      medium: { quality: 80, format: "webp" },
      low: { quality: 60, format: "webp" },
    },
    video: {
      high: { crf: 23, preset: "slow", codec: "libvpx-vp9", format: "webm" },
      medium: {
        crf: 28,
        preset: "medium",
        codec: "libvpx-vp9",
        format: "webm",
      },
      low: { crf: 35, preset: "fast", codec: "libvpx-vp9", format: "webm" },
    },
  };

  return settings[type][quality];
}
