import { execFile } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const FFMPEG = ffmpegPath as string;

/**
 * 获取视频时长（秒）
 * 通过解析 `ffmpeg -i` 输出到 stderr 的 Duration 行
 */
export function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    execFile(FFMPEG, ['-i', inputPath], (_error, _stdout, stderr) => {
      // ffmpeg -i 无输出文件时会以非零状态退出，但 stderr 含元数据
      const output = stderr || '';
      const match = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
      if (!match) {
        resolve(0);
        return;
      }
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseFloat(match[3]);
      resolve(hours * 3600 + minutes * 60 + seconds);
    });
  });
}

/**
 * 截取视频指定时间点的一帧作为缩略图
 * @param inputPath   源视频路径
 * @param outputPath  缩略图输出路径（.jpg）
 * @param seekSeconds 截取时间点（秒），默认第 1 秒
 */
export function generateThumbnail(
  inputPath: string,
  outputPath: string,
  seekSeconds = 1,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', String(seekSeconds),
      '-i', inputPath,
      '-frames:v', '1',
      '-q:v', '2',
      '-y',
      outputPath,
    ];
    execFile(FFMPEG, args, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
