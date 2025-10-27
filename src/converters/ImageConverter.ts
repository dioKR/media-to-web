import sharp from "sharp";
import fs from "fs";
import path from "path";
import type {
  ImageConfig,
  ProgressInfo,
  ConversionResult,
} from "../config/types.js";
import { BaseConverter, type ConversionBatchResult } from "./BaseConverter.js";

export class ImageConverter extends BaseConverter {
  constructor() {
    super([".jpg", ".jpeg", ".png"]);
  }

  protected async convertSingle(
    inputPath: string,
    outputPath: string,
    config: ImageConfig,
    progressCallback?: ((info: ProgressInfo) => void) | null
  ): Promise<void> {
    const outputFormat = config.format || "webp";
    const outputFileName =
      path.basename(inputPath, path.extname(inputPath)) + `.${outputFormat}`;
    const finalOutputPath = path.join(path.dirname(outputPath), outputFileName);

    // Sharp를 사용한 이미지 변환
    if (outputFormat === "webp") {
      await sharp(inputPath)
        .webp({ quality: config.quality })
        .toFile(finalOutputPath);
    } else if (outputFormat === "avif") {
      await sharp(inputPath)
        .avif({ quality: config.quality })
        .toFile(finalOutputPath);
    } else {
      throw new Error(`Unsupported image format: ${outputFormat}`);
    }
  }

  public async convert(
    inputFolder: string,
    outputFolder: string,
    config: ImageConfig,
    selectedFiles: string[] | null,
    progressCallback: ((info: ProgressInfo) => void) | null,
    concurrency: number | null
  ): Promise<ConversionResult> {
    // 출력 폴더 생성
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // 선택된 파일이 있으면 그것만, 없으면 모든 이미지 파일
    let imageFiles: string[];

    if (selectedFiles && selectedFiles.length > 0) {
      imageFiles = selectedFiles;
    } else {
      imageFiles = this.filterFiles(inputFolder, this.supportedExtensions);
    }

    if (imageFiles.length === 0) {
      throw new Error("No image files found to convert.");
    }

    // 병렬 처리 설정
    const actualConcurrency = this.getConcurrencyLevel(concurrency);

    // 개별 파일 변환 함수
    const convertSingleImage = async (
      file: string,
      index: number
    ): Promise<ConversionBatchResult> => {
      const inputPath = path.join(inputFolder, file);
      const outputFormat = config.format || "webp";
      const outputFileName =
        path.basename(file, path.extname(file)) + `.${outputFormat}`;
      const outputPath = path.join(outputFolder, outputFileName);

      // 진행률 콜백 호출
      this.reportProgress(progressCallback, {
        current: index + 1,
        total: imageFiles.length,
        file: file,
        status: "converting",
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
          total: imageFiles.length,
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
          total: imageFiles.length,
          file: file,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });

        return { success: false, result: failedResult };
      }
    };

    // 병렬로 모든 파일 변환 실행
    const conversionResults = await this.processInBatches(
      imageFiles,
      actualConcurrency,
      convertSingleImage
    );

    // 결과 분류
    return this.classifyResults(conversionResults);
  }
}
