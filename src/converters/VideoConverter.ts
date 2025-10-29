import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import type {
  VideoConfig,
  ProgressInfo,
  ConversionResult,
  GPUInfo,
} from "../config/types.js";
import { BaseConverter, type ConversionBatchResult } from "./BaseConverter.js";

// FFmpeg 바이너리 경로 설정
if (ffmpegStatic) {
  (ffmpeg as any).setFfmpegPath(ffmpegStatic);
}

export class VideoConverter extends BaseConverter {
  constructor() {
    super([".mp4", ".mov", ".avi", ".mkv"]);
  }

  /**
   * GPU를 감지합니다.
   */
  public detectGPU(): GPUInfo {
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

  /**
   * GPU에 따른 인코더를 선택합니다.
   */
  public getVideoEncoder(
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

  protected async convertSingle(
    inputPath: string,
    outputPath: string,
    config: VideoConfig,
    progressCallback?: ((info: ProgressInfo) => void) | null
  ): Promise<void> {
    const outputFormat = config.format || "webm";
    const outputFileName =
      path.basename(inputPath, path.extname(inputPath)) + `.${outputFormat}`;
    const finalOutputPath = path.join(path.dirname(outputPath), outputFileName);

    // GPU 감지 및 인코더 선택
    const gpuInfo = this.detectGPU();
    const encoderOptions = this.getVideoEncoder(gpuInfo, config);

    return new Promise((resolve, reject) => {
      // GPU 인코더 옵션이 있으면 사용, 없으면 format에 따라 적절한 코덱 사용
      const options = encoderOptions.options;

      ffmpeg(inputPath)
        .outputOptions(options)
        .output(finalOutputPath)
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
            progressCallback({
              current: 0,
              total: 0,
              file: path.basename(inputPath),
              status: "converting",
              progress: (progress as { percent: number }).percent,
            });
          }
        })
        .run();
    });
  }

  public async convert(
    inputFolder: string,
    outputFolder: string,
    config: VideoConfig,
    selectedFiles: string[] | null,
    progressCallback: ((info: ProgressInfo) => void) | null,
    concurrency: number | null
  ): Promise<ConversionResult> {
    // 출력 폴더 생성
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // 선택된 파일이 있으면 그것만, 없으면 모든 비디오 파일
    let videoFiles: string[];

    if (selectedFiles && selectedFiles.length > 0) {
      videoFiles = selectedFiles;
    } else {
      videoFiles = this.filterFiles(inputFolder, this.supportedExtensions);
    }

    if (videoFiles.length === 0) {
      throw new Error("No video files found to convert.");
    }

    // 병렬 처리 설정
    const actualConcurrency = this.getConcurrencyLevel(concurrency);

    // 개별 파일 변환 함수
    const convertSingleVideo = async (
      file: string,
      index: number
    ): Promise<ConversionBatchResult> => {
      const inputPath = path.join(inputFolder, file);
      const outputFormat = config.format || "webm";
      const outputFileName =
        path.basename(file, path.extname(file)) + `.${outputFormat}`;
      const outputPath = path.join(outputFolder, outputFileName);

      // 진행률 콜백 호출
      this.reportProgress(progressCallback, {
        current: index + 1,
        total: videoFiles.length,
        file: file,
        status: "converting",
        progress: 0,
      });

      try {
        await this.convertSingle(
          inputPath,
          outputPath,
          config,
          progressCallback
        );

        const stats = this.calculateFileStats(inputPath, outputPath);

        // 완료 콜백 호출
        this.reportProgress(progressCallback, {
          current: index + 1,
          total: videoFiles.length,
          file: file,
          status: "completed",
        });

        return { success: true, result: stats };
      } catch (error: unknown) {
        const failedResult = {
          file: file,
          error: error instanceof Error ? error.message : String(error),
        };

        // 실패 콜백 호출
        this.reportProgress(progressCallback, {
          current: index + 1,
          total: videoFiles.length,
          file: file,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });

        return { success: false, result: failedResult };
      }
    };

    // 병렬로 모든 파일 변환 실행
    const conversionResults = await this.processInBatches(
      videoFiles,
      actualConcurrency,
      convertSingleVideo
    );

    // 결과 분류
    return this.classifyResults(conversionResults);
  }
}
