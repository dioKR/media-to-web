import { getFiles } from "../utils/fileUtils.js";

export class FileSelectionPrompt {
  private readonly SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
  private readonly SUPPORTED_VIDEO_EXTENSIONS = [
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
  ];

  /**
   * 파일 선택을 처리합니다.
   */
  public async prompt(
    currentDir: string,
    convertType: "image" | "video"
  ): Promise<{ files: string[] }> {
    const inquirer = await import("inquirer");

    // 현재 폴더의 파일 목록 가져오기
    const supportedExtensions =
      convertType === "image"
        ? this.SUPPORTED_IMAGE_EXTENSIONS
        : this.SUPPORTED_VIDEO_EXTENSIONS;

    const files = getFiles(currentDir, supportedExtensions);

    if (files.length === 0) {
      throw new Error(
        `No ${
          convertType === "image" ? "image" : "video"
        } files found in the current folder to convert.`
      );
    }

    // 파일 선택 (2단계 방식 - 더 나은 UX)
    let selectionMode;
    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "selectionMode",
          message: "How would you like to select files?",
          choices: [
            { name: "✓ Select all files", value: "all" },
            { name: "📁 Choose individual files", value: "individual" },
            new inquirer.default.Separator(),
            { name: "← Back to mode selection", value: "__back__" },
          ],
        },
      ]);

      if (result.selectionMode === "__back__") {
        throw new Error("__back__");
      } else {
        selectionMode = result.selectionMode;
        break;
      }
    }

    if (selectionMode === "all") {
      return { files: files };
    } else {
      const choices = files.map((file) => ({ name: file, value: file }));

      const selectedFiles = await inquirer.default.prompt([
        {
          type: "checkbox",
          name: "files",
          message: "Select files to convert:",
          choices: choices,
          validate: (input: string[]) => {
            if (input.length === 0) {
              return "Please select at least one file.";
            }
            return true;
          },
        },
      ]);

      return selectedFiles;
    }
  }
}
