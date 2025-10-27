#!/usr/bin/env node

import chalk from "chalk";
import ora from "ora";
import {
  promptUser,
  getQualitySettings,
  getConcurrencyLevel,
} from "../src/prompts.js";
import { convertImages } from "../src/imageConverter.js";
import {
  convertVideos,
  detectGPU,
  getVideoEncoder,
} from "../src/videoConverter.js";
import type { ImageConfig, VideoConfig } from "../src/config/types.js";

console.log(chalk.bold.cyan("\n🎨 Media to Web CLI\n"));

async function main(): Promise<void> {
  try {
    // 사용자 입력 받기
    const config = await promptUser();

    const qualitySettings = getQualitySettings(
      config.quality,
      config.convertType,
      config.advancedConfig
    );

    console.log(chalk.gray("\nConfiguration:"));
    console.log(
      chalk.gray(
        `  Convert type: ${
          config.convertType === "image" ? "Images" : "Videos"
        }`
      )
    );
    console.log(
      chalk.gray(`  Mode: ${config.mode === "simple" ? "Simple" : "Advanced"}`)
    );
    console.log(chalk.gray(`  Selected files: ${config.selectedFiles.length}`));
    console.log(chalk.gray(`  Input folder: ${config.inputFolder}`));
    console.log(chalk.gray(`  Output folder: ${config.outputFolder}`));

    // CPU 사용률 설정 표시
    const actualConcurrency = getConcurrencyLevel(
      config.concurrency,
      config.convertType
    );
    console.log(
      chalk.gray(
        `  CPU usage: ${config.concurrency} (${actualConcurrency} concurrent processes)`
      )
    );

    if (config.mode === "simple") {
      console.log(chalk.gray(`  Quality: ${config.quality}`));
    } else {
      // 고급 모드 설정 표시
      if (config.convertType === "image") {
        const imageSettings = qualitySettings as ImageConfig;
        console.log(chalk.gray(`  Image quality: ${imageSettings.quality}`));
        console.log(
          chalk.gray(`  Format: ${imageSettings.format.toUpperCase()}`)
        );
      } else {
        const videoSettings = qualitySettings as VideoConfig;
        console.log(chalk.gray(`  CRF: ${videoSettings.crf}`));
        console.log(chalk.gray(`  Preset: ${videoSettings.preset}`));
        console.log(chalk.gray(`  Codec: ${videoSettings.codec}`));
      }
    }
    console.log();

    // GPU 감지 및 하드웨어 가속 설정
    let gpuInfo = null;
    let videoEncoder = null;

    if (config.convertType === "video") {
      gpuInfo = detectGPU();
      videoEncoder = getVideoEncoder(gpuInfo, qualitySettings as VideoConfig);

      // GPU 상태 표시
      if (gpuInfo.available) {
        console.log(
          chalk.green(
            `✓ ${gpuInfo.type.toUpperCase()} GPU detected - Hardware acceleration enabled`
          )
        );
        console.log(chalk.gray(`  Using encoder: ${videoEncoder.codec}`));
      } else {
        console.log(chalk.gray("ℹ No GPU detected - Using CPU encoding"));
        console.log(chalk.gray(`  Using encoder: ${videoEncoder.codec}`));
      }
      console.log(); // 빈 줄 추가
    }

    // 변환 시작 시간 기록
    const startTime = Date.now();

    // 개별 파일 진행률 추적을 위한 상태
    const fileProgress = new Map();
    let currentFile = "";
    let spinner = ora("Preparing conversion...").start();

    // 진행률 콜백 함수
    const progressCallback = (progressInfo: any) => {
      const { current, total, file, status, progress, error } = progressInfo;

      if (status === "converting") {
        currentFile = file;
        fileProgress.set(file, { status, progress: progress || 0 });

        if (progress !== undefined) {
          // 비디오 변환 중 - 퍼센트 표시
          spinner.text = `Converting ${file} (${current}/${total}) - ${progress.toFixed(
            1
          )}%`;
        } else {
          // 이미지 변환 중 - 파일명만 표시
          spinner.text = `Converting ${file} (${current}/${total})`;
        }
      } else if (status === "completed") {
        fileProgress.set(file, { status: "completed", progress: 100 });
        spinner.succeed(`✓ ${file} completed (${current}/${total})`);

        // 다음 파일이 있으면 새로운 스피너 시작
        if (current < total) {
          spinner = ora("Preparing next file...").start();
        }
      } else if (status === "failed") {
        fileProgress.set(file, { status: "failed", error });
        spinner.fail(`✗ ${file} failed: ${error} (${current}/${total})`);

        // 다음 파일이 있으면 새로운 스피너 시작
        if (current < total) {
          spinner = ora("Preparing next file...").start();
        }
      }
    };

    let results;

    if (config.convertType === "image") {
      results = await convertImages(
        config.inputFolder,
        config.outputFolder,
        qualitySettings as ImageConfig,
        config.selectedFiles,
        progressCallback,
        actualConcurrency
      );
    } else {
      results = await convertVideos(
        config.inputFolder,
        config.outputFolder,
        qualitySettings as VideoConfig,
        config.selectedFiles,
        progressCallback,
        videoEncoder ? videoEncoder.options : null,
        actualConcurrency
      );
    }

    // 변환 완료 시간 기록 및 소요시간 계산
    const endTime = Date.now();
    const elapsedTime = endTime - startTime;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const remainingSeconds = elapsedSeconds % 60;

    let timeString;
    if (elapsedMinutes > 0) {
      timeString = `${elapsedMinutes}m ${remainingSeconds}s`;
    } else {
      timeString = `${elapsedSeconds}s`;
    }

    // 마지막 스피너 정리
    if (spinner.isSpinning) {
      spinner.succeed("Conversion completed!\n");
    } else {
      console.log(chalk.green("\n✓ Conversion completed!\n"));
    }

    // 성공한 변환 결과 출력
    if (results.success.length > 0) {
      console.log(
        chalk.bold.green(`✅ Success (${results.success.length} files):\n`)
      );
      results.success.forEach((item) => {
        console.log(
          chalk.green(`  ${item.input}`) +
            chalk.gray(" → ") +
            chalk.cyan(item.output)
        );
        console.log(
          chalk.gray(`    ${item.inputSize}`) +
            chalk.gray(" → ") +
            chalk.blue(item.outputSize) +
            chalk.yellow(` (${item.reduction}% reduction)`)
        );
      });
    }

    // 실패한 변환 결과 출력
    if (results.failed.length > 0) {
      console.log(
        chalk.bold.red(`\n❌ Failed (${results.failed.length} files):\n`)
      );
      results.failed.forEach((item) => {
        console.log(chalk.red(`  ${item.file}: ${item.error}`));
      });
    }

    console.log(chalk.gray(`\nOutput folder: ${config.outputFolder}`));
    console.log(chalk.gray(`Total elapsed time: ${timeString}\n`));
  } catch (error: any) {
    console.error(chalk.red("\n❌ Error occurred:"), error.message);
    process.exit(1);
  }
}

main();
