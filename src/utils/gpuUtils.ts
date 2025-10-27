import { execSync } from "child_process";
import type { GPUInfo, VideoConfig } from "../config/types.js";

/**
 * GPU를 감지합니다.
 */
export function detectGPU(): GPUInfo {
  try {
    // NVIDIA GPU 확인
    execSync("nvidia-smi", { stdio: "ignore" });
    return { available: true, type: "nvidia" };
  } catch {
    try {
      // AMD GPU 확인 (선택적)
      execSync("rocm-smi", { stdio: "ignore" });
      return { available: true, type: "amd" };
    } catch {
      return { available: false, type: "none" };
    }
  }
}

/**
 * GPU에 따른 비디오 인코더를 선택합니다.
 */
export function getVideoEncoder(
  gpuInfo: GPUInfo,
  qualitySettings: VideoConfig
): { codec: string; options: string[] } {
  if (gpuInfo.available && gpuInfo.type === "nvidia") {
    // NVIDIA GPU 사용
    return {
      codec: "h264_nvenc",
      options: [
        "-c:v h264_nvenc",
        `-crf ${qualitySettings.crf}`,
        `-preset ${qualitySettings.preset}`,
        "-c:a libopus",
        "-b:a 128k",
        "-rc:v vbr",
        "-cq:v 23",
      ],
    };
  } else if (gpuInfo.available && gpuInfo.type === "amd") {
    // AMD GPU 사용 (선택적)
    return {
      codec: "h264_amf",
      options: [
        "-c:v h264_amf",
        `-crf ${qualitySettings.crf}`,
        `-preset ${qualitySettings.preset}`,
        "-c:a libopus",
        "-b:a 128k",
      ],
    };
  } else {
    // CPU 사용 (format에 따라 코덱 선택)
    if (qualitySettings.format === "webm") {
      return {
        codec: "libvpx-vp9",
        options: [
          "-c:v libvpx-vp9",
          `-crf ${qualitySettings.crf}`,
          `-preset ${qualitySettings.preset}`,
          "-c:a libopus",
          "-b:a 128k",
          "-row-mt 1",
          "-threads 0",
        ],
      };
    } else {
      // MP4 포맷
      return {
        codec: "libx264",
        options: [
          "-c:v libx264",
          `-crf ${qualitySettings.crf}`,
          `-preset ${qualitySettings.preset}`,
          "-c:a aac",
          "-b:a 128k",
          "-threads 0",
          "-movflags +faststart",
        ],
      };
    }
  }
}

/**
 * GPU 정보를 문자열로 포맷합니다.
 */
export function formatGPUInfo(gpuInfo: GPUInfo): string {
  if (gpuInfo.available) {
    return `${gpuInfo.type.toUpperCase()} GPU detected - Hardware acceleration enabled`;
  }
  return "No GPU detected - Using CPU encoding";
}
