import type { ConversionConfig } from "../config/types.js";
import { ConversionTypePrompt } from "./ConversionTypePrompt.js";
import { ModePrompt } from "./ModePrompt.js";
import { FileSelectionPrompt } from "./FileSelectionPrompt.js";
import { QualityPrompt } from "./QualityPrompt.js";
import { FolderBrowserPrompt } from "./FolderBrowserPrompt.js";
import { ConfigurationBuilder } from "./ConfigurationBuilder.js";

export class PromptManager {
  private conversionTypePrompt: ConversionTypePrompt;
  private modePrompt: ModePrompt;
  private fileSelectionPrompt: FileSelectionPrompt;
  private qualityPrompt: QualityPrompt;
  private folderBrowserPrompt: FolderBrowserPrompt;
  private configBuilder: ConfigurationBuilder;

  constructor() {
    this.conversionTypePrompt = new ConversionTypePrompt();
    this.modePrompt = new ModePrompt();
    this.fileSelectionPrompt = new FileSelectionPrompt();
    this.qualityPrompt = new QualityPrompt();
    this.folderBrowserPrompt = new FolderBrowserPrompt();
    this.configBuilder = new ConfigurationBuilder();
  }

  /**
   * 사용자로부터 변환 설정을 수집합니다.
   */
  public async promptUser(inputFolder?: string): Promise<ConversionConfig> {
    const currentDir = inputFolder || process.cwd();

    // 1. 변환 타입 선택
    const convertType = await this.conversionTypePrompt.prompt(inputFolder);

    // 2. 모드 선택 (Simple/Advanced)
    const mode = await this.modePrompt.prompt(inputFolder);

    // 3. 파일 선택
    const selectedFilesResult = await this.fileSelectionPrompt.prompt(
      currentDir,
      convertType
    );
    const selectedFiles = selectedFilesResult.files;

    // 4. 품질 설정
    const { quality, advancedConfig } = await this.qualityPrompt.prompt(
      convertType,
      mode
    );

    // 5. CPU 사용률 설정
    const concurrency = await this.promptConcurrency(inputFolder);

    // 6. 출력 폴더 설정
    const outputFolder = await this.promptOutputFolder(currentDir, inputFolder);

    // 7. ConfigurationBuilder를 사용하여 최종 설정 생성
    return this.configBuilder.build({
      convertType,
      inputFolder: currentDir,
      selectedFiles,
      outputFolder,
      quality,
      mode,
      advancedConfig,
      concurrency,
    });
  }

  /**
   * CPU 사용률 설정을 프롬프트합니다.
   */
  private async promptConcurrency(
    inputFolder?: string
  ): Promise<number | "maximum" | "balanced" | "light"> {
    const inquirer = await import("inquirer");
    const os = await import("os");

    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "concurrency",
          message: "CPU usage level:",
          choices: [
            { name: "⚡ Maximum - Use all available cores", value: "maximum" },
            { name: "⚖️ Balanced - Recommended (cores/2)", value: "balanced" },
            { name: "🐢 Light - Use fewer cores", value: "light" },
            { name: "⚙️ Custom - Specify number of cores", value: "custom" },
            new inquirer.default.Separator(),
            { name: "← Back to quality selection", value: "__back__" },
          ],
        },
      ]);

      if (result.concurrency === "__back__") {
        // 품질 설정으로 돌아가기
        return await this.promptConcurrency(inputFolder);
      } else if (result.concurrency === "custom") {
        const customResult = await inquirer.default.prompt([
          {
            type: "input",
            name: "customCores",
            message: "Enter number of concurrent processes:",
            validate: (input: string) => {
              const num = parseInt(input);
              if (isNaN(num) || num <= 0) {
                return "Please enter a positive number.";
              }
              return true;
            },
          },
        ]);
        return parseInt(customResult.customCores);
      } else {
        return result.concurrency;
      }
    }
  }

  /**
   * 출력 폴더 설정을 프롬프트합니다.
   */
  private async promptOutputFolder(
    currentDir: string,
    inputFolder?: string
  ): Promise<string> {
    const inquirer = await import("inquirer");
    const path = await import("path");
    const fs = await import("fs");

    while (true) {
      // 입력 폴더 기준으로 기본 출력 폴더 설정
      const defaultOutputFolder = path.join(currentDir, "converted");

      const result = await inquirer.default.prompt([
        {
          type: "input",
          name: "outputFolder",
          message: "Output folder for converted files:",
          default: defaultOutputFolder,
          validate: (input: string) => {
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
        // CPU 사용률 설정으로 돌아가기
        return await this.promptConcurrency(inputFolder).then(() =>
          this.promptOutputFolder(currentDir, inputFolder)
        );
      } else {
        const outputFolder = result.outputFolder;

        // 상대경로인 경우 입력 폴더 기준으로 해석
        const resolvedOutputFolder = path.isAbsolute(outputFolder)
          ? path.resolve(outputFolder)
          : path.resolve(currentDir, outputFolder);

        // 출력 폴더 생성
        if (!fs.existsSync(resolvedOutputFolder)) {
          fs.mkdirSync(resolvedOutputFolder, { recursive: true });
        }

        return resolvedOutputFolder;
      }
    }
  }
}
