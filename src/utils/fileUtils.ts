import fs from "fs";
import path from "path";

/**
 * 바이트를 사람이 읽기 쉬운 형태로 포맷합니다.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * 폴더에서 지정된 확장자의 파일들을 가져옵니다.
 */
export function getFiles(folder: string, extensions: string[]): string[] {
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
 * 디렉토리가 존재하지 않으면 생성합니다.
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 경로를 검증합니다.
 */
export function validatePath(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== "string") {
    return false;
  }

  try {
    // 경로가 존재하는지 확인
    return fs.existsSync(inputPath);
  } catch {
    return false;
  }
}
