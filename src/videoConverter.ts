import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import type {
  VideoConfig,
  ProgressInfo,
  ConversionResult,
  GPUInfo,
} from "./config/types.js";

// FFmpeg 바이너리 경로 설정
if (ffmpegStatic) {
  (ffmpeg as any).setFfmpegPath(ffmpegStatic);
}

const SUPPORTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"];

// GPU 감지 함수
export function detectGPU(): GPUInfo {
  try {
    // NVIDIA GPU 확인
    execSync("nvidia-smi", { stdio: "ignore" });
    return { available: true, type: "nvidia" };
  } catch {
    try {
      // AMD GPU 확인 (선택적)
      execSync("rocm-smi", { stdio: "ignore" });
      return { available: true, type: "amd" };
    } catch {
      return { available: false, type: "none" };
    }
  }
}

// GPU에 따른 인코더 선택
export function getVideoEncoder(
  gpuInfo: GPUInfo,
  qualitySettings: VideoConfig
): { codec: string; options: string[] } {
  if (gpuInfo.available && gpuInfo.type === "nvidia") {
    // NVIDIA GPU 사용
    return {
      codec: "h264_nvenc",
      options: [
        "-c:v h264_nvenc",
        `-crf ${qualitySettings.crf}`,
        `-preset ${qualitySettings.preset}`,
        "-c:a libopus",
        "-b:a 128k",
        "-rc:v vbr",
        "-cq:v 23",
      ],
    };
  } else if (gpuInfo.available && gpuInfo.type === "amd") {
    // AMD GPU 사용 (선택적)
    return {
      codec: "h264_amf",
      options: [
        "-c:v h264_amf",
        `-crf ${qualitySettings.crf}`,
        `-preset ${qualitySettings.preset}`,
        "-c:a libopus",
        "-b:a 128k",
      ],
    };
  } else {
    // CPU 사용 (format에 따라 코덱 선택)
    if (qualitySettings.format === "webm") {
      return {
        codec: "libvpx-vp9",
        options: [
          "-c:v libvpx-vp9",
          `-crf ${qualitySettings.crf}`,
          `-preset ${qualitySettings.preset}`,
          "-c:a libopus",
          "-b:a 128k",
          "-row-mt 1",
          "-threads 0",
        ],
      };
    } else {
      // MP4 포맷
      return {
        codec: "libx264",
        options: [
          "-c:v libx264",
          `-crf ${qualitySettings.crf}`,
          `-preset ${qualitySettings.preset}`,
          "-c:a aac",
          "-b:a 128k",
          "-threads 0",
          "-movflags +faststart",
        ],
      };
    }
  }
}

export async function convertVideos(
  inputFolder: string,
  outputFolder: string,
  qualitySettings: VideoConfig,
  selectedFiles: string[] | null = null,
  progressCallback: ((info: ProgressInfo) => void) | null = null,
  encoderOptions: string[] | null = null,
  concurrency: number | null = null
): Promise<ConversionResult> {
  // 선택된 파일이 있으면 그것만, 없으면 모든 비디오 파일
  let videoFiles;

  if (selectedFiles && selectedFiles.length > 0) {
    videoFiles = selectedFiles;
  } else {
    console.log(`Looking for video files in: ${inputFolder}`);
    const files = fs.readdirSync(inputFolder);
    console.log(`Found ${files.length} files in directory`);
    console.log(
      `Files: ${files.slice(0, 10).join(", ")}${files.length > 10 ? "..." : ""}`
    );

    videoFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      const isVideo = SUPPORTED_VIDEO_EXTENSIONS.includes(ext);
      if (isVideo) {
        console.log(`Found video file: ${file}`);
      }
      return isVideo;
    });
    console.log(`Found ${videoFiles.length} video files`);
  }

  if (videoFiles.length === 0) {
    throw new Error("No video files found to convert.");
  }

  const results: ConversionResult = {
    success: [],
    failed: [],
  };

  // 병렬 처리 설정 (사용자 설정 또는 기본값)
  const actualConcurrency =
    concurrency || Math.max(1, Math.floor(os.cpus().length / 2));

  // 개별 파일 변환 함수
  const convertSingleVideoFile = async (file: string, index: number) => {
    const inputPath = path.join(inputFolder, file);
    const outputExtension =
      qualitySettings.format === "webm" ? ".webm" : ".mp4";
    const outputFileName =
      path.basename(file, path.extname(file)) + outputExtension;
    const outputPath = path.join(outputFolder, outputFileName);

    // 진행률 콜백 호출
    if (progressCallback) {
      progressCallback({
        current: index + 1,
        total: videoFiles.length,
        file: file,
        status: "converting",
        progress: 0,
      });
    }

    try {
      await convertSingleVideo(
        inputPath,
        outputPath,
        qualitySettings,
        (progress: number) => {
          // 비디오 변환 중 진행률 업데이트
          if (progressCallback) {
            progressCallback({
              current: index + 1,
              total: videoFiles.length,
              file: file,
              status: "converting",
              progress: progress,
            });
          }
        },
        encoderOptions
      );

      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      const reduction = (
        (1 - outputStats.size / inputStats.size) *
        100
      ).toFixed(1);

      const result = {
        input: file,
        output: outputFileName,
        inputSize: formatBytes(inputStats.size),
        outputSize: formatBytes(outputStats.size),
        reduction: reduction,
      };

      // 완료 콜백 호출
      if (progressCallback) {
        progressCallback({
          current: index + 1,
          total: videoFiles.length,
          file: file,
          status: "completed",
        });
      }

      return { success: true, result };
    } catch (error: unknown) {
      const failedResult = {
        file: file,
        error: error instanceof Error ? error.message : String(error),
      };

      // 실패 콜백 호출
      if (progressCallback) {
        progressCallback({
          current: index + 1,
          total: videoFiles.length,
          file: file,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return { success: false, result: failedResult };
    }
  };

  // 제한된 병렬 처리 구현
  const processInBatches = async (files: string[], batchSize: number) => {
    const results = [];
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((file: string, batchIndex: number) =>
          convertSingleVideoFile(file, i + batchIndex)
        )
      );
      results.push(...batchResults);
    }
    return results;
  };

  // 병렬로 모든 파일 변환 실행
  const conversionResults = await processInBatches(
    videoFiles,
    actualConcurrency
  );

  // 결과 분류
  conversionResults.forEach(
    ({
      success,
      result,
    }: {
      success: boolean;
      result:
        | {
            input: string;
            output: string;
            inputSize: string;
            outputSize: string;
            reduction: string;
          }
        | { file: string; error: string };
    }) => {
      if (success) {
        results.success.push(
          result as {
            input: string;
            output: string;
            inputSize: string;
            outputSize: string;
            reduction: string;
          }
        );
      } else {
        results.failed.push(result as { file: string; error: string });
      }
    }
  );

  return results;
}

function convertSingleVideo(
  inputPath: string,
  outputPath: string,
  qualitySettings: VideoConfig,
  progressCallback: ((progress: number) => void) | null = null,
  encoderOptions: string[] | null = null
): Promise<void> {
  return new Promise((resolve, reject) => {
    // GPU 인코더 옵션이 있으면 사용, 없으면 format에 따라 적절한 코덱 사용
    const options =
      encoderOptions ||
      (qualitySettings.format === "webm"
        ? [
            "-c:v libvpx-vp9",
            `-crf ${qualitySettings.crf}`,
            `-preset ${qualitySettings.preset}`,
            "-c:a libopus",
            "-b:a 128k",
            "-row-mt 1",
            "-threads 0",
          ]
        : [
            "-c:v libx264",
            `-crf ${qualitySettings.crf}`,
            `-preset ${qualitySettings.preset}`,
            "-c:a aac",
            "-b:a 128k",
            "-threads 0",
            "-movflags +faststart",
          ]);

    ffmpeg(inputPath)
      .outputOptions(options)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: unknown) =>
        reject(err instanceof Error ? err : new Error(String(err)))
      )
      .on("progress", (progress: unknown) => {
        // 진행률 콜백 호출
        if (
          progressCallback &&
          typeof progress === "object" &&
          progress !== null &&
          "percent" in progress
        ) {
          progressCallback((progress as { percent: number }).percent);
        }
      })
      .run();
  });
}

export function getVideoFiles(folderPath: string): string[] {
  const files = fs.readdirSync(folderPath);
  return files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_VIDEO_EXTENSIONS.includes(ext);
  });
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
