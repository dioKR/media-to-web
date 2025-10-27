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

/**
 * 파일이 지원되는 이미지 형식인지 확인합니다.
 */
export function isImageFile(filePath: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * 파일이 지원되는 비디오 형식인지 확인합니다.
 */
export function isVideoFile(filePath: string): boolean {
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv"];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
}

/**
 * 파일 크기를 가져옵니다.
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * 파일이 존재하는지 확인합니다.
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
