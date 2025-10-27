import { BaseConverter } from "./BaseConverter.js";
import { ImageConverter } from "./ImageConverter.js";
import { VideoConverter } from "./VideoConverter.js";

export type ConverterType = "image" | "video";

export class ConverterFactory {
  private static imageConverter: ImageConverter | null = null;
  private static videoConverter: VideoConverter | null = null;

  /**
   * 지정된 타입에 맞는 컨버터를 생성합니다.
   */
  public static createConverter(type: ConverterType): BaseConverter {
    switch (type) {
      case "image":
        if (!this.imageConverter) {
          this.imageConverter = new ImageConverter();
        }
        return this.imageConverter;

      case "video":
        if (!this.videoConverter) {
          this.videoConverter = new VideoConverter();
        }
        return this.videoConverter;

      default:
        throw new Error(`Unsupported converter type: ${type}`);
    }
  }

  /**
   * 모든 컨버터 인스턴스를 초기화합니다.
   */
  public static reset(): void {
    this.imageConverter = null;
    this.videoConverter = null;
  }
}
