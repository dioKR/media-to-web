![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Status](https://img.shields.io/badge/status-alpha-orange)

# 🎨 Media to Web CLI

A powerful CLI tool to convert images and videos to web-optimized formats with advanced features and GPU acceleration.

[English](#) | [한국어](./README.ko.md)

## ⚠️ Development Status

This project is currently in **early development** (v0.0.1).

**Known Limitations:**

- Limited format support (WebP, WebM only)
- No recursive folder scanning
- No batch configuration files
- Limited error handling

**Planned Features:**

- Additional formats (AVIF, HEIC, etc.)
- Recursive folder processing
- Configuration file support
- Better error messages
- Performance optimizations

Contributions and feedback are welcome!

## ✨ Key Features

- 🖼️ **Image Conversion**: JPG/PNG → WebP/AVIF
- 🎬 **Video Conversion**: MP4/MOV → WebM with GPU acceleration
- 📁 **Interactive folder browser** starting from root directory
- 🎯 **Command line arguments** (--help, --version, input-path)
- 📁 **Smart file selection** (select all or individual files)
- ⚡ **Parallel processing** with CPU usage control
- 🚀 **GPU acceleration** (NVIDIA/AMD auto-detection)
- 📊 **Real-time progress tracking** (per-file progress for videos)
- ⚙️ **Advanced mode** with custom encoding parameters
- 🔄 **Back navigation** at every step
- ⏱️ **Elapsed time tracking**
- 🛡️ **Graceful exit handling** with file cleanup options
- 🌐 **Bilingual support** (English/Korean)

## 📦 Installation

### From NPM (Coming Soon)

```bash
# Install globally
npm install -g media-to-web

# Use the CLI
npx mtw-cli
```

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/media-to-web.git
cd media-to-web

# Install dependencies
npm install

# Run the CLI
npm start
# or
node bin/index.js
```

## 🚀 Usage

### Command Line Arguments

```bash
# Show help
npx mtw-cli --help

# Show version
npx mtw-cli --version

# Convert files in specific folder
npx mtw-cli /path/to/your/media/files

# Interactive mode (browse folders)
npx mtw-cli
```

### Run with NPX (Recommended)

```bash
# Navigate to folder with files to convert
cd /path/to/your/media/files

# Run CLI
npx mtw-cli
```

### Run locally

```bash
npm start
```

## 💡 Usage Example

### Interactive Folder Browser

```bash
$ npx mtw-cli

🎨 Media to Web CLI

? How would you like to select the input folder? 📁 Browse folders

📁 Current directory: /
Found 12 folders
? Select an option: 📁 Users

📁 Current directory: /Users
Found 2 folders
? Select an option: 📁 butfitseoul

📁 Current directory: /Users/butfitseoul
Found 18 folders
? Select an option: 📁 Downloads

📁 Current directory: /Users/butfitseoul/Downloads
Found 6 folders
? Select an option: ✅ Select this folder
Selected input folder: /Users/butfitseoul/Downloads

? What would you like to convert? 🎬 Videos (mp4/mov → webm)

? Select configuration mode: 🔧 Simple Mode - Use presets

? How would you like to select files? ✓ Select all files

? Select conversion quality: Medium - Recommended

? CPU usage level: ⚖️ Balanced - Recommended (cores/2)

? Output folder for converted files: ./converted

Configuration:
  Convert type: Images
  Mode: Simple
  Selected files: 3
  Input folder: /Users/username/Photos
  Output folder: /Users/username/Photos/converted
  CPU usage: balanced (2 concurrent processes)
  Quality: medium

✔ Converting 3 files...

✅ Success (3 files):

  photo1.jpg → photo1.webp
    2.5 MB → 850 KB (66.0% reduction)
  photo2.png → photo2.webp
    4.1 MB → 1.2 MB (70.7% reduction)
  vacation.jpeg → vacation.webp
    1.2 MB → 420 KB (65.0% reduction)

Output folder: /Users/username/Photos/converted
Total elapsed time: 2m 34s
```

## 🎯 Supported Formats

### Images

- **Input**: `.jpg`, `.jpeg`, `.png`
- **Output**: `.webp`

### Videos

- **Input**: `.mp4`, `.mov`, `.avi`, `.mkv`
- **Output**: `.webm`

## ⚙️ Configuration Modes

### Simple Mode (Default)

Quick setup with predefined quality presets:

**Images:**

- **High**: 90% quality, WebP format
- **Medium**: 80% quality, WebP format (recommended)
- **Low**: 60% quality, WebP format

**Videos:**

- **High**: CRF 23, Slow preset, VP9 codec
- **Medium**: CRF 28, Medium preset, VP9 codec (recommended)
- **Low**: CRF 35, Fast preset, VP9 codec

### Advanced Mode

Custom encoding parameters for power users:

**Images:**

- Custom quality (0-100)
- Format selection (WebP/AVIF)
- Advanced Sharp options

**Videos:**

- Custom CRF value (0-51)
- Encoding preset selection
- Codec selection (VP9/H.264/H.265)
- GPU acceleration options

## 🚀 Performance Features

### CPU Usage Control

- **Maximum**: Use all available cores (fastest)
- **Balanced**: Use half the cores (recommended)
- **Light**: Use 1-2 processes (gentle on system)
- **Custom**: Specify exact number of concurrent processes

### GPU Acceleration

- **NVIDIA GPU**: Automatic detection and H.264 NVENC encoding
- **AMD GPU**: Automatic detection and H.264 AMF encoding
- **CPU Fallback**: VP9 encoding when no GPU detected
- **Quality Preserved**: Same CRF values regardless of encoder

### Parallel Processing

- **Images**: 2-4x faster with parallel processing
- **Videos**: 2-3x faster with parallel processing
- **Smart Batching**: Optimal batch sizes for different file types

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Image conversion**: [Sharp](https://sharp.pixelplumbing.com/)
- **Video conversion**: [FFmpeg](https://ffmpeg.org/) (fluent-ffmpeg + ffmpeg-static)
- **CLI interface**: [Inquirer](https://github.com/SBoudrias/Inquirer.js)
- **UI enhancement**: [Chalk](https://github.com/chalk/chalk), [Ora](https://github.com/sindresorhus/ora)

## 📂 Project Structure

```
media-convert/
├── bin/
│   └── index.js          # CLI entry point
├── src/
│   ├── prompts.js        # User input handling
│   ├── imageConverter.js # Image conversion logic
│   └── videoConverter.js # Video conversion logic
├── package.json
└── README.md
```

## 🚧 Future Plans

- [x] Command line options (`--help`, `--version`, `--input-path`)
- [x] Real-time progress display
- [x] Parallel processing support
- [x] Interactive folder browser
- [x] Graceful exit handling
- [ ] Recursive subfolder scanning (`--recursive`)
- [ ] Additional format support (HEIC, etc.)
- [ ] Resizing/cropping features
- [ ] Metadata preservation options
- [x] npm publishing setup

## 📝 License

MIT

## 🤝 Contributing

Issues and PRs are welcome!

## ⚠️ Notes

- Requires Node.js 18 or higher
- FFmpeg is automatically included (ffmpeg-static)
- Large file conversion may take time
- Original files are not modified (saved to new folder)
