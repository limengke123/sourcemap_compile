import archiver from 'archiver';
import { existsSync, unlinkSync, createWriteStream } from 'fs';
import { resolve, join } from 'path';
import { readdir, stat } from 'fs/promises';

const distDir = resolve(process.cwd(), 'dist');
const zipFile = resolve(process.cwd(), 'dist.zip');

// 删除旧的zip文件（如果存在）
if (existsSync(zipFile)) {
  console.log('删除旧的zip文件...');
  unlinkSync(zipFile);
}

// 检查dist目录是否存在
if (!existsSync(distDir)) {
  console.error('错误: dist目录不存在，请先运行构建命令');
  process.exit(1);
}

// 创建zip文件
console.log('正在创建dist.zip...');

const output = createWriteStream(zipFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // 最大压缩
});

output.on('close', () => {
  console.log(`✓ dist.zip 创建成功 (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  console.error('创建zip文件失败:', err.message);
  process.exit(1);
});

archive.pipe(output);

// 递归添加目录中的所有文件
async function addDirectory(dirPath, basePath = '') {
  const entries = await readdir(dirPath);
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const relativePath = basePath ? `${basePath}/${entry}` : entry;
    const stats = await stat(fullPath);
    
    if (stats.isDirectory()) {
      await addDirectory(fullPath, relativePath);
    } else {
      archive.file(fullPath, { name: `dist/${relativePath}` });
    }
  }
}

// 开始添加文件
addDirectory(distDir)
  .then(() => {
    archive.finalize();
  })
  .catch((err) => {
    console.error('添加文件到zip失败:', err.message);
    process.exit(1);
  });

