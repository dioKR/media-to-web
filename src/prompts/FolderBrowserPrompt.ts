import { existsSync, readdirSync } from "fs";
import { resolve } from "path";

export class FolderBrowserPrompt {
  /**
   * 폴더 탐색 기능
   */
  public async browseFolders(currentPath: string = "/"): Promise<string> {
    const inquirer = await import("inquirer");

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

        console.log(`\n📁 Current directory: ${currentPath}`);
        console.log(`Found ${folders.length} folders`);

        const { action } = await inquirer.default.prompt([
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
            console.log("Already at root directory");
          }
        } else if (action === "manual") {
          const { manualPath } = await inquirer.default.prompt([
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
        console.error("Error reading directory:", error);
        console.log("Trying to access parent directory...");

        // 권한 문제로 접근할 수 없는 경우 상위 디렉토리로 이동
        const parentPath = resolve(currentPath, "..");
        if (parentPath !== currentPath) {
          currentPath = parentPath;
        } else {
          console.log("Cannot access this directory. Going back to main menu.");
          return "back";
        }
      }
    }
  }

  /**
   * 폴더 선택 기능
   */
  public async selectInputFolder(): Promise<string> {
    const inquirer = await import("inquirer");

    const choices = [
      { name: "📁 Browse folders", value: "browse" },
      { name: "📝 Enter path manually", value: "manual" },
      { name: "📂 Use current directory", value: process.cwd() },
    ];

    const { folderOption } = await inquirer.default.prompt([
      {
        type: "list",
        name: "folderOption",
        message: "How would you like to select the input folder?",
        choices: choices,
      },
    ]);

    if (folderOption === "browse") {
      const selectedPath = await this.browseFolders();
      if (selectedPath === "back") {
        return await this.selectInputFolder(); // 다시 메인 메뉴로
      }
      return selectedPath;
    } else if (folderOption === "manual") {
      const { manualPath } = await inquirer.default.prompt([
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
}
