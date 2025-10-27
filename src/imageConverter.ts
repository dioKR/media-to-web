import sharp from "sharp";
import fs from "fs";
import path from "path";
import os from "os";
import type {
  ImageConfig,
  ProgressInfo,
  ConversionResult,
} from "./config/types.js";

const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export async function convertImages(
  inputFolder: string,
  outputFolder: string,
  qualitySettings: ImageConfig,
  selectedFiles: string[] | null = null,
  progressCallback: ((info: ProgressInfo) => void) | null = null,
  concurrency: number | null = null
): Promise<ConversionResult> {
  // 선택된 파일이 있으면 그것만, 없으면 모든 이미지 파일
  let imageFiles;

  if (selectedFiles && selectedFiles.length > 0) {
    imageFiles = selectedFiles;
  } else {
    const files = fs.readdirSync(inputFolder);
    imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
    });
  }

  if (imageFiles.length === 0) {
    throw new Error("No image files found to convert.");
  }

  const results: ConversionResult = {
    success: [],
    failed: [],
  };

  // 병렬 처리 설정 (사용자 설정 또는 기본값)
  const actualConcurrency = concurrency || Math.max(1, os.cpus().length - 1);

  // 개별 파일 변환 함수
  const convertSingleImage = async (file: string, index: number) => {
    const inputPath = path.join(inputFolder, file);
    const outputFileName = path.basename(file, path.extname(file)) + ".webp";
    const outputPath = path.join(outputFolder, outputFileName);

    // 진행률 콜백 호출
    if (progressCallback) {
      progressCallback({
        current: index + 1,
        total: imageFiles.length,
        file: file,
        status: "converting",
      });
    }

    try {
      await sharp(inputPath)
        .webp({ quality: qualitySettings.quality })
        .toFile(outputPath);

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
          total: imageFiles.length,
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
          total: imageFiles.length,
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
          convertSingleImage(file, i + batchIndex)
        )
      );
      results.push(...batchResults);
    }
    return results;
  };

  // 병렬로 모든 파일 변환 실행
  const conversionResults = await processInBatches(
    imageFiles,
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

export function getImageFiles(folderPath: string): string[] {
  const files = fs.readdirSync(folderPath);
  return files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
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
