declare module "fluent-ffmpeg" {
  interface FFmpegCommand {
    outputOptions(options: string[]): FFmpegCommand;
    output(path: string): FFmpegCommand;
    on(event: string, callback: (...args: unknown[]) => void): FFmpegCommand;
    run(): void;
  }

  interface FFmpegStatic {
    setFfmpegPath(path: string): void;
  }

  function ffmpeg(inputPath: string): FFmpegCommand;
  const ffmpegStatic: FFmpegStatic;
  export = ffmpeg;
  export { ffmpegStatic };
}
