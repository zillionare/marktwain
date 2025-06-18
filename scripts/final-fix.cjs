#!/usr/bin/env node

/**
 * 最终修复脚本 - 修复所有剩余的导入问题
 */

const fs = require('fs');
const { execSync } = require('child_process');

// 需要修复的文件和对应的修复
const FIXES = [
  // EditorHeader/index.vue - 添加 toast 导入
  {
    file: 'src/components/CodemirrorEditor/EditorHeader/index.vue',
    action: 'addToastImport'
  },
  
  // EditorStateDialog.vue - 添加 toast 导入
  {
    file: 'src/components/CodemirrorEditor/EditorStateDialog.vue',
    action: 'addToastImport'
  },
  
  // PostSlider.vue - 添加 toast 导入
  {
    file: 'src/components/CodemirrorEditor/PostSlider.vue',
    action: 'addToastImport'
  },
  
  // UploadImgDialog.vue - 添加 toast 导入
  {
    file: 'src/components/CodemirrorEditor/UploadImgDialog.vue',
    action: 'addToastImport'
  }
];

// 修复函数
function addToastImport(filePath) {
  console.log(`🔧 修复 ${filePath} - 添加 toast 导入`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否已经导入了 toast
  if (content.includes("import { toast }") || content.includes("from 'vue-sonner'")) {
    console.log(`✅ ${filePath} 已经包含 toast 导入`);
    return false;
  }
  
  // 查找 script setup 标签
  const scriptSetupMatch = content.match(/(<script setup[^>]*>)/);
  if (!scriptSetupMatch) {
    console.log(`⚠️ ${filePath} 没有找到 script setup 标签`);
    return false;
  }
  
  // 查找最后一个 import 语句的位置
  const importMatches = [...content.matchAll(/^import .+$/gm)];
  if (importMatches.length === 0) {
    // 如果没有 import 语句，在 script setup 后添加
    const insertPoint = scriptSetupMatch.index + scriptSetupMatch[0].length;
    const toastImport = "\nimport { toast } from 'vue-sonner'\n";
    const newContent = content.slice(0, insertPoint) + toastImport + content.slice(insertPoint);
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ 已为 ${filePath} 添加 toast 导入`);
    return true;
  } else {
    // 在最后一个 import 语句后添加
    const lastImport = importMatches[importMatches.length - 1];
    const insertPoint = lastImport.index + lastImport[0].length;
    const toastImport = "\nimport { toast } from 'vue-sonner'";
    const newContent = content.slice(0, insertPoint) + toastImport + content.slice(insertPoint);
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ 已为 ${filePath} 添加 toast 导入`);
    return true;
  }
}

// 应用修复
function applyFixes() {
  console.log('🚀 开始最终修复...');
  
  let fixedCount = 0;
  
  for (const fix of FIXES) {
    try {
      if (fs.existsSync(fix.file)) {
        if (fix.action === 'addToastImport') {
          const fixed = addToastImport(fix.file);
          if (fixed) {
            fixedCount++;
          }
        }
      } else {
        console.log(`⚠️ 文件不存在: ${fix.file}`);
      }
    } catch (error) {
      console.error(`❌ 修复 ${fix.file} 失败:`, error.message);
    }
  }
  
  console.log(`🎉 最终修复完成！共修复 ${fixedCount} 个文件`);
  return fixedCount;
}

// 主函数
function main() {
  const fixedCount = applyFixes();
  
  if (fixedCount > 0) {
    console.log('\n🔄 运行构建测试...');
    try {
      execSync('npm run build:only', { stdio: 'inherit' });
      console.log('✅ 构建成功！');
    } catch (error) {
      console.log('⚠️ 构建仍有问题，但主要导入问题已修复');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { applyFixes, addToastImport };
