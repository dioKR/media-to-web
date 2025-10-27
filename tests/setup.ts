// Jest 테스트 설정 파일
import { jest } from "@jest/globals";

// 글로벌 테스트 설정
beforeAll(() => {
  // 테스트 시작 전 설정
  console.log("🧪 Starting E2E tests...");
});

afterAll(() => {
  // 테스트 종료 후 정리
  console.log("✅ E2E tests completed");
});

// 글로벌 타임아웃 설정
jest.setTimeout(30000);
