![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Status](https://img.shields.io/badge/status-alpha-orange)

# 🎨 Media to Web CLI

고급 기능과 GPU 가속을 지원하는 웹 최적화 미디어 변환 CLI 도구입니다.

[English](./README.md) | [한국어](#)

## ⚠️ 개발 상태

이 프로젝트는 현재 **초기 개발 단계**입니다 (v0.0.1).

**알려진 제한사항:**

- 제한된 포맷 지원 (WebP, WebM만)
- 재귀적 폴더 스캔 없음
- 배치 설정 파일 없음
- 제한된 오류 처리

**계획된 기능:**

- 추가 포맷 (AVIF, HEIC 등)
- 재귀적 폴더 처리
- 설정 파일 지원
- 더 나은 오류 메시지
- 성능 최적화

기여와 피드백을 환영합니다!

## ✨ 주요 기능

- 🖼️ **이미지 변환**: JPG/PNG → WebP/AVIF
- 🎬 **동영상 변환**: GPU 가속을 통한 MP4/MOV → WebM
- 📁 **스마트 파일 선택** (전체 선택 또는 개별 선택)
- ⚡ **병렬 처리** 및 CPU 사용률 제어
- 🚀 **GPU 가속** (NVIDIA/AMD 자동 감지)
- 📊 **실시간 진행률 추적** (동영상의 파일별 진행률)
- ⚙️ **고급 모드** 사용자 정의 인코딩 매개변수
- 🔄 **모든 단계에서 뒤로가기**
- ⏱️ **소요 시간 추적**
- 🌐 **다국어 지원** (영어/한국어)

## 📦 설치

```bash
npm install
```

## 🚀 사용법

### NPX로 바로 실행 (권장)

```bash
# 변환할 파일이 있는 폴더로 이동
cd /path/to/your/media/files

# CLI 실행
npx media-convert-cli
```

### 로컬에서 실행

```bash
npm start
```

## 💡 사용 예시

```bash
$ cd ~/Photos
$ npx media-convert-cli

🎨 미디어 변환 CLI

? 무엇을 변환하시겠어요? 🖼️  이미지 (jpg/png → webp)

? 현재 폴더의 이미지 파일: (스페이스로 선택, Enter로 확인)
─── 선택 옵션 ───
 ◉ ✓ 모두 선택 / 모두 해제
─── 파일 목록 ───
 ◉ photo1.jpg (2.5 MB)
 ◉ photo2.png (4.1 MB)
 ◯ screenshot.png (850 KB)
 ◉ vacation.jpeg (1.2 MB)

? 변환 품질을 선택하세요: 중간 (Medium) - 권장

? 변환된 파일을 저장할 폴더: ./converted

설정 내용:
  변환 타입: 이미지
  선택된 파일: 3개
  입력 폴더: /Users/username/Photos
  출력 폴더: /Users/username/Photos/converted
  품질 설정: medium

✔ 변환 완료!

✅ 성공 (3개):

  photo1.jpg → photo1.webp
    2.5 MB → 850 KB (66.0% 감소)
  photo2.png → photo2.webp
    4.1 MB → 1.2 MB (70.7% 감소)
  vacation.jpeg → vacation.webp
    1.2 MB → 420 KB (65.0% 감소)

출력 폴더: /Users/username/Photos/converted
```

## 🎯 지원 포맷

### 이미지

- **입력**: `.jpg`, `.jpeg`, `.png`
- **출력**: `.webp`

### 동영상

- **입력**: `.mp4`, `.mov`, `.avi`, `.mkv`
- **출력**: `.webm`

## ⚙️ 품질 설정

### 이미지

- **높음**: 90% 품질
- **중간**: 80% 품질 (권장)
- **낮음**: 60% 품질

### 동영상

- **높음**: CRF 23, Slow 프리셋
- **중간**: CRF 28, Medium 프리셋 (권장)
- **낮음**: CRF 35, Fast 프리셋

## 🛠️ 기술 스택

- **런타임**: Node.js (ES Modules)
- **이미지 변환**: [Sharp](https://sharp.pixelplumbing.com/)
- **동영상 변환**: [FFmpeg](https://ffmpeg.org/) (fluent-ffmpeg + ffmpeg-static)
- **CLI 인터페이스**: [Inquirer](https://github.com/SBoudrias/Inquirer.js)
- **UI 개선**: [Chalk](https://github.com/chalk/chalk), [Ora](https://github.com/sindresorhus/ora)

## 📂 프로젝트 구조

```
media-convert/
├── bin/
│   └── index.js          # CLI 진입점
├── src/
│   ├── prompts.js        # 사용자 입력 처리
│   ├── imageConverter.js # 이미지 변환 로직
│   └── videoConverter.js # 동영상 변환 로직
├── package.json
└── README.md
```

## 🚧 향후 계획 (유료 버전)

- [ ] 명령줄 옵션 추가 (`--quality`, `--overwrite`)
- [ ] 실시간 진행률 표시
- [ ] 병렬 처리 지원
- [ ] 하위 폴더 재귀 탐색 (`--recursive`)
- [ ] AVIF, HEIC 등 추가 포맷 지원
- [ ] 리사이징/크롭 기능
- [ ] 메타데이터 보존 옵션
- [ ] npm 배포

## 📝 라이선스

MIT

## 🤝 기여

이슈와 PR을 환영합니다!

## ⚠️ 주의사항

- Node.js 18 이상 필요
- FFmpeg은 자동으로 포함됨 (ffmpeg-static)
- 대용량 파일 변환 시 시간이 소요될 수 있음
- 원본 파일은 변경되지 않음 (새 폴더에 저장)
