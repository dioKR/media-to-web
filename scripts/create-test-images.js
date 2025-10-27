#!/usr/bin/env node

/**
 * 테스트용 샘플 이미지 생성 스크립트
 * 
 * 사용법:
 * node scripts/create-test-images.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFolder = path.join(__dirname, '../test-images');

async function createTestImages() {
  // 테스트 폴더 생성
  if (!fs.existsSync(testFolder)) {
    fs.mkdirSync(testFolder, { recursive: true });
  }

  console.log('테스트 이미지 생성 중...\n');

  // 다양한 색상의 샘플 이미지 생성
  const images = [
    { name: 'red-sample.jpg', color: { r: 255, g: 0, b: 0 } },
    { name: 'green-sample.png', color: { r: 0, g: 255, b: 0 } },
    { name: 'blue-sample.jpg', color: { r: 0, g: 0, b: 255 } },
  ];

  for (const img of images) {
    const outputPath = path.join(testFolder, img.name);
    
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: img.color
      }
    })
    .jpeg({ quality: 90 })
    .toFile(outputPath);

    console.log(`✅ 생성: ${img.name}`);
  }

  console.log(`\n테스트 이미지가 생성되었습니다: ${testFolder}`);
  console.log('다음 명령어로 테스트하세요:');
  console.log(`  npm start ${testFolder}`);
}

createTestImages().catch(console.error);
