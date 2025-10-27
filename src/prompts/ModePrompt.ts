export class ModePrompt {
  /**
   * 모드를 선택합니다.
   */
  public async prompt(inputFolder?: string): Promise<"simple" | "advanced"> {
    const inquirer = await import("inquirer");

    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "mode",
          message: "Select configuration mode:",
          choices: [
            { name: "🔧 Simple Mode - Use presets", value: "simple" },
            { name: "⚙️  Advanced Mode - Custom settings", value: "advanced" },
            new inquirer.default.Separator(),
            { name: "← Back to file type selection", value: "__back__" },
          ],
          default: "simple",
        },
      ]);

      if (result.mode === "__back__") {
        // 변환 타입 선택으로 돌아가기
        throw new Error("__back__");
      } else {
        return result.mode;
      }
    }
  }
}
