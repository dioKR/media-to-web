import fs from "fs";
import path from "path";
import os from "os";
import type { ProgressInfo, ConversionResult } from "../config/types.js";

export interface ConversionStats {
  input: string;
  output: string;
  inputSize: string;
  outputSize: string;
  reduction: string;
}

export interface ConversionError {
  file: string;
  error: string;
}

export interface ConversionBatchResult {
  success: boolean;
  result: ConversionStats | ConversionError;
}

export abstract class BaseConverter {
  protected supportedExtensions: string[];

  constructor(supportedExtensions: string[]) {
    this.supportedExtensions = supportedExtensions;
  }

  /**
   * 폴더에서 지원되는 파일들을 필터링합니다.
   */
  protected filterFiles(folder: string, extensions: string[]): string[] {
    try {
      const files = fs.readdirSync(folder);
      return files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return extensions.includes(ext);
      });
    } catch (error) {
      throw new Error(`Failed to read directory ${folder}: ${error}`);
    }
  }

  /**
   * 파일들을 배치로 나누어 처리합니다.
   */
  protected async processInBatches(
    files: string[],
    batchSize: number,
    handler: (file: string, index: number) => Promise<ConversionBatchResult>
  ): Promise<ConversionBatchResult[]> {
    const results: ConversionBatchResult[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((file: string, batchIndex: number) =>
          handler(file, i + batchIndex)
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 진행률 콜백을 호출합니다.
   */
  protected reportProgress(
    progressCallback: ((info: ProgressInfo) => void) | null,
    info: ProgressInfo
  ): void {
    if (progressCallback) {
      progressCallback(info);
    }
  }

  /**
   * 파일 통계를 계산합니다.
   */
  protected calculateFileStats(
    inputPath: string,
    outputPath: string
  ): ConversionStats {
    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);
    const reduction = ((1 - outputStats.size / inputStats.size) * 100).toFixed(
      1
    );

    return {
      input: path.basename(inputPath),
      output: path.basename(outputPath),
      inputSize: this.formatBytes(inputStats.size),
      outputSize: this.formatBytes(outputStats.size),
      reduction: reduction,
    };
  }

  /**
   * 바이트를 사람이 읽기 쉬운 형태로 포맷합니다.
   */
  protected formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  /**
   * CPU 사용률에 따른 동시성 레벨을 계산합니다.
   */
  protected getConcurrencyLevel(concurrency: number | null): number {
    if (concurrency !== null) {
      return concurrency;
    }
    return Math.max(1, os.cpus().length - 1);
  }

  /**
   * 결과를 분류합니다.
   */
  protected classifyResults(
    batchResults: ConversionBatchResult[]
  ): ConversionResult {
    const results: ConversionResult = {
      success: [],
      failed: [],
    };

    batchResults.forEach(({ success, result }) => {
      if (success) {
        results.success.push(result as ConversionStats);
      } else {
        results.failed.push(result as ConversionError);
      }
    });

    return results;
  }

  /**
   * 단일 파일 변환을 수행합니다. 서브클래스에서 구현해야 합니다.
   */
  protected abstract convertSingle(
    inputPath: string,
    outputPath: string,
    config: any,
    progressCallback?: ((info: ProgressInfo) => void) | null
  ): Promise<void>;

  /**
   * 파일들을 변환합니다.
   */
  public abstract convert(
    inputFolder: string,
    outputFolder: string,
    config: any,
    selectedFiles: string[] | null,
    progressCallback: ((info: ProgressInfo) => void) | null,
    concurrency: number | null
  ): Promise<ConversionResult>;
}
