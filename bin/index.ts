#!/usr/bin/env node

import chalk from "chalk";
import ora from "ora";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { resolve, join, basename, extname } from "path";
import inquirer from "inquirer";
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

// 명령행 인자 파싱
function parseArgs(): { inputPath?: string; help: boolean; version: boolean } {
  const args = process.argv.slice(2);
  const result = {
    inputPath: undefined as string | undefined,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--version" || arg === "-v") {
      result.version = true;
    } else if (!arg.startsWith("-") && !result.inputPath) {
      result.inputPath = resolve(arg);
    }
  }

  return result;
}

// 도움말 출력
function showHelp(): void {
  console.log(chalk.bold.cyan("\n🎨 Media to Web CLI\n"));
  console.log(chalk.bold("Usage:"));
  console.log("  npx mtw [input-path] [options]");
  console.log("  npx mtw --help");
  console.log("  npx mtw --version");
  console.log();
  console.log(chalk.bold("Arguments:"));
  console.log("  input-path    Path to input folder containing media files");
  console.log();
  console.log(chalk.bold("Options:"));
  console.log("  -h, --help    Show this help message");
  console.log("  -v, --version Show version number");
  console.log();
  console.log(chalk.bold("Examples:"));
  console.log(
    "  npx mtw /path/to/images     # Interactive mode with pre-selected folder"
  );
  console.log("  npx mtw /Users/username/Desktop/photos");
  console.log("  npx mtw                    # Interactive mode");
  console.log();
  console.log(chalk.bold("Interactive Mode:"));
  console.log(
    "  The CLI always runs in interactive mode where you can configure"
  );
  console.log(
    "  settings step by step. If a path is provided, it will be used as"
  );
  console.log(
    "  the default input folder, but you can still change it during setup."
  );
  console.log();
}

// 버전 출력
async function showVersion(): Promise<void> {
  try {
    const packageJson = await import("../package.json", {
      with: { type: "json" },
    });
    console.log(packageJson.default.version);
  } catch (error) {
    console.log("0.0.1");
  }
}

// 입력 경로 검증
function validateInputPath(inputPath: string): boolean {
  if (!existsSync(inputPath)) {
    console.error(chalk.red(`❌ Error: Path does not exist: ${inputPath}`));
    return false;
  }

  return true;
}

// 폴더 탐색 기능
async function browseFolders(currentPath: string = "/"): Promise<string> {
  while (true) {
    try {
      // 현재 디렉토리의 폴더들 가져오기 (숨김 파일 제외)
      const items = readdirSync(currentPath, { withFileTypes: true });
      const folders = items
        .filter(
          (dirent) => dirent.isDirectory() && !dirent.name.startsWith(".")
        )
        .map((dirent) => ({
          name: `📁 ${dirent.name}`,
          value: resolve(currentPath, dirent.name),
        }));

      const choices = [
        { name: "✅ Select this folder", value: "select" },
        ...(currentPath !== "/"
          ? [{ name: "📂 Parent directory", value: "parent" }]
          : []),
        ...folders,
        { name: "📝 Enter path manually", value: "manual" },
        { name: "🔙 Back to main menu", value: "back" },
      ];

      console.log(chalk.blue(`\n📁 Current directory: ${currentPath}`));
      console.log(chalk.gray(`Found ${folders.length} folders`));

      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Select an option:",
          choices: choices,
        },
      ]);

      if (action === "select") {
        return currentPath;
      } else if (action === "parent") {
        const parentPath = resolve(currentPath, "..");
        if (parentPath !== currentPath) {
          currentPath = parentPath;
        } else {
          console.log(chalk.yellow("Already at root directory"));
        }
      } else if (action === "manual") {
        const { manualPath } = await inquirer.prompt([
          {
            type: "input",
            name: "manualPath",
            message: "Enter the folder path:",
            validate: (input: string) => {
              if (!input.trim()) {
                return "Please enter a valid path";
              }
              if (!existsSync(input.trim())) {
                return "Path does not exist. Please check and try again.";
              }
              return true;
            },
          },
        ]);
        return resolve(manualPath.trim());
      } else if (action === "back") {
        return "back";
      } else {
        // 폴더 선택
        currentPath = action;
      }
    } catch (error) {
      console.error(chalk.red("Error reading directory:", error));
      console.log(chalk.yellow("Trying to access parent directory..."));

      // 권한 문제로 접근할 수 없는 경우 상위 디렉토리로 이동
      const parentPath = resolve(currentPath, "..");
      if (parentPath !== currentPath) {
        currentPath = parentPath;
      } else {
        console.log(
          chalk.red("Cannot access this directory. Going back to main menu.")
        );
        return "back";
      }
    }
  }
}

// 폴더 선택 기능
async function selectInputFolder(): Promise<string> {
  const choices = [
    { name: "📁 Browse folders", value: "browse" },
    { name: "📝 Enter path manually", value: "manual" },
    { name: "📂 Use current directory", value: process.cwd() },
  ];

  const { folderOption } = await inquirer.prompt([
    {
      type: "list",
      name: "folderOption",
      message: "How would you like to select the input folder?",
      choices: choices,
    },
  ]);

  if (folderOption === "browse") {
    const selectedPath = await browseFolders();
    if (selectedPath === "back") {
      return await selectInputFolder(); // 다시 메인 메뉴로
    }
    return selectedPath;
  } else if (folderOption === "manual") {
    const { manualPath } = await inquirer.prompt([
      {
        type: "input",
        name: "manualPath",
        message: "Enter the folder path:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Please enter a valid path";
          }
          if (!existsSync(input.trim())) {
            return "Path does not exist. Please check and try again.";
          }
          return true;
        },
      },
    ]);
    return resolve(manualPath.trim());
  } else {
    return folderOption;
  }
}

console.log(chalk.bold.cyan("\n🎨 Media to Web CLI\n"));

// 중단 시 정리할 파일들을 추적
let convertedFiles: string[] = [];
let outputFolder: string = "";

// Ctrl+C 처리
process.on("SIGINT", () => {
  console.log(chalk.yellow("\n\n⚠️  Conversion interrupted by user"));

  if (convertedFiles.length > 0) {
    console.log(
      chalk.yellow(`Found ${convertedFiles.length} converted files:`)
    );
    convertedFiles.forEach((file) => {
      console.log(chalk.gray(`  - ${file}`));
    });

    console.log(
      chalk.yellow("\nDo you want to keep the converted files? (y/N)")
    );
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (data) => {
      const key = data.toString();
      if (key === "y" || key === "Y") {
        console.log(chalk.green("✓ Keeping converted files"));
        process.exit(0);
      } else {
        console.log(chalk.red("🗑️  Cleaning up converted files..."));
        convertedFiles.forEach((file) => {
          try {
            if (existsSync(file)) {
              unlinkSync(file);
              console.log(chalk.gray(`  Deleted: ${file}`));
            }
          } catch (error) {
            console.log(chalk.red(`  Failed to delete: ${file}`));
          }
        });
        console.log(chalk.green("✓ Cleanup completed"));
        process.exit(0);
      }
    });
  } else {
    console.log(chalk.gray("No converted files to clean up"));
    process.exit(0);
  }
});

async function main(): Promise<void> {
  try {
    const args = parseArgs();

    // 도움말 출력
    if (args.help) {
      showHelp();
      return;
    }

    // 버전 출력
    if (args.version) {
      await showVersion();
      return;
    }

    let config;

    let inputFolder: string;

    // 명령행 인자로 입력 경로가 제공된 경우
    if (args.inputPath) {
      if (!validateInputPath(args.inputPath)) {
        process.exit(1);
      }
      inputFolder = args.inputPath;
      console.log(chalk.gray(`Input folder: ${inputFolder}`));
      console.log(
        chalk.gray(
          "Starting interactive mode with pre-selected input folder...\n"
        )
      );
    } else {
      // 폴더 선택
      inputFolder = await selectInputFolder();
      console.log(chalk.gray(`Selected input folder: ${inputFolder}\n`));
    }

    // 대단형 모드 (입력 폴더 미리 설정)
    config = await promptUser(inputFolder);

    // 출력 폴더 저장 (정리용)
    outputFolder = config.outputFolder;

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

        // 변환된 파일 추적 (정리용)
        const outputFile = join(
          outputFolder,
          basename(file, extname(file)) +
            (config.convertType === "image"
              ? ".webp"
              : (qualitySettings as VideoConfig).format === "webm"
              ? ".webm"
              : ".mp4")
        );
        convertedFiles.push(outputFile);

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
