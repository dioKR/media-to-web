import {
  QUALITY_PRESETS,
  VIDEO_OUTPUT_FORMATS,
  type VideoConfig,
  type VideoFormat,
  type GPUInfo,
} from "./types.js";

// 비디오 품질 프리셋 (이전 설정으로 복원)
export const VIDEO_QUALITY_PRESETS = {
  [QUALITY_PRESETS.VIDEO.HIGH]: {
    crf: 23,
    preset: "slow",
    codec: "libvpx-vp9",
  },
  [QUALITY_PRESETS.VIDEO.MEDIUM]: {
    crf: 28,
    preset: "medium",
    codec: "libvpx-vp9",
  },
  [QUALITY_PRESETS.VIDEO.LOW]: {
    crf: 35,
    preset: "fast",
    codec: "libvpx-vp9",
  },
};

// 이전 프리셋들 (고품질, 느림)
export const VIDEO_QUALITY_PRESETS_LEGACY = {
  HIGH_QUALITY: {
    crf: 23,
    preset: "slow",
    codec: "libvpx-vp9",
    description: "최고 품질 (WebM, 느림)",
  },
  MEDIUM_QUALITY: {
    crf: 28,
    preset: "medium",
    codec: "libvpx-vp9",
    description: "중간 품질 (WebM, 중간 속도)",
  },
  LOW_QUALITY: {
    crf: 35,
    preset: "fast",
    codec: "libvpx-vp9",
    description: "낮은 품질 (WebM, 빠름)",
  },
};

// 추가 최적화 프리셋들
export const VIDEO_QUALITY_PRESETS_EXTENDED = {
  ULTRA_FAST: {
    crf: 35,
    preset: "ultrafast",
    codec: "libx264",
    description: "최고 속도 (품질 낮음)",
  },
  BALANCED: {
    crf: 26,
    preset: "fast",
    codec: "libx264",
    description: "균형 (속도 + 품질)",
  },
  HIGH_QUALITY_H264: {
    crf: 22,
    preset: "slow",
    codec: "libx264",
    description: "고품질 H.264 (느림)",
  },
  WEB_OPTIMIZED: {
    crf: 28,
    preset: "fast",
    codec: "libx264",
    description: "웹 최적화 (MP4, 빠름)",
  },
  ARCHIVE: {
    crf: 18,
    preset: "veryslow",
    codec: "libx265",
    description: "아카이브용 (최고 압축, 매우 느림)",
  },
};

// 고급 비디오 설정 기본값 (이전 설정으로 복원)
export const DEFAULT_ADVANCED_VIDEO_CONFIG = {
  crf: 28,
  preset: "medium",
  codec: "libvpx-vp9",
  bitrate: "128k",
  resolution: null, // 원본 해상도 유지
  fps: null, // 원본 FPS 유지
  format: VIDEO_OUTPUT_FORMATS.WEBM,
  audioCodec: "libopus",
  audioBitrate: "128k",
};

// 비디오 CRF 검증
export function validateVideoCRF(crf: number): boolean {
  return crf >= 0 && crf <= 51;
}

// 비디오 프리셋 검증
export function validateVideoPreset(preset: string): boolean {
  const validPresets = [
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow",
  ];
  return validPresets.includes(preset);
}

// 비디오 코덱 검증
export function validateVideoCodec(codec: string): boolean {
  const validCodecs = [
    "libvpx-vp9",
    "h264_nvenc",
    "h264_amf",
    "libx264",
    "libx265",
  ];
  return validCodecs.includes(codec);
}

// 비디오 포맷 검증
export function validateVideoFormat(format: string): boolean {
  return Object.values(VIDEO_OUTPUT_FORMATS).includes(format as VideoFormat);
}

// 비디오 설정 생성
export function createVideoConfig(
  crf: number,
  preset: string,
  codec: string,
  advanced: Partial<VideoConfig> = {}
): VideoConfig {
  const config: VideoConfig = {
    ...DEFAULT_ADVANCED_VIDEO_CONFIG,
    crf: crf || DEFAULT_ADVANCED_VIDEO_CONFIG.crf,
    preset: preset || DEFAULT_ADVANCED_VIDEO_CONFIG.preset,
    codec: codec || DEFAULT_ADVANCED_VIDEO_CONFIG.codec,
    ...advanced,
  };

  if (!validateVideoCRF(config.crf)) {
    throw new Error("Video CRF must be between 0 and 51");
  }

  if (!validateVideoPreset(config.preset)) {
    throw new Error(`Invalid video preset: ${config.preset}`);
  }

  if (!validateVideoCodec(config.codec)) {
    throw new Error(`Unsupported video codec: ${config.codec}`);
  }

  if (!validateVideoFormat(config.format)) {
    throw new Error(`Unsupported video format: ${config.format}`);
  }

  return config;
}

// FFmpeg 옵션 생성
export function createFFmpegOptions(
  config: VideoConfig,
  gpuInfo: GPUInfo | null = null
): string[] {
  const options = [];

  // 비디오 코덱
  options.push(`-c:v ${config.codec}`);

  // GPU 가속 설정
  if (gpuInfo && gpuInfo.available) {
    if (gpuInfo.type === "nvidia" && config.codec === "h264_nvenc") {
      options.push(`-crf ${config.crf}`);
      options.push(`-preset ${config.preset}`);
      options.push("-rc:v vbr");
      options.push("-cq:v 23");
    } else if (gpuInfo.type === "amd" && config.codec === "h264_amf") {
      options.push(`-crf ${config.crf}`);
      options.push(`-preset ${config.preset}`);
    } else {
      // CPU 코덱
      options.push(`-crf ${config.crf}`);
      options.push(`-preset ${config.preset}`);
      if (config.codec === "libvpx-vp9") {
        options.push("-row-mt 1");
        options.push("-threads 0");
      }
    }
  } else {
    // CPU 코덱
    options.push(`-crf ${config.crf}`);
    options.push(`-preset ${config.preset}`);
    if (config.codec === "libvpx-vp9") {
      options.push("-row-mt 1");
      options.push("-threads 0");
    }
  }

  // 오디오 코덱
  options.push(`-c:a ${config.audioCodec}`);
  options.push(`-b:a ${config.audioBitrate}`);

  // 해상도 설정
  if (config.resolution) {
    options.push(`-s ${config.resolution}`);
  }

  // FPS 설정
  if (config.fps) {
    options.push(`-r ${config.fps}`);
  }

  return options;
}
