export class ConversionTypePrompt {
  /**
   * 변환 타입을 선택합니다.
   */
  public async prompt(inputFolder?: string): Promise<"image" | "video"> {
    const inquirer = await import("inquirer");

    while (true) {
      const result = await inquirer.default.prompt([
        {
          type: "list",
          name: "convertType",
          message: "What would you like to convert?",
          choices: [
            { name: "🖼️  Images (jpg/png → webp)", value: "image" },
            { name: "🎬 Videos (mp4/mov → webm)", value: "video" },
          ],
        },
      ]);

      if (result.convertType !== "__back__") {
        return result.convertType;
      }
    }
  }
}
