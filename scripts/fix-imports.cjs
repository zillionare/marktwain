#!/usr/bin/env node

/**
 * 批量修复 Vue 组合式 API 导入问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 需要添加的导入
const VUE_IMPORTS = [
  'ref', 'computed', 'watch', 'reactive', 'onMounted', 'onBeforeMount', 
  'onBeforeUnmount', 'onUnmounted', 'nextTick', 'toRaw', 'markRaw'
];

const PINIA_IMPORTS = ['storeToRefs'];
const VUEUSE_IMPORTS = ['useStorage', 'useToggle', 'useDark', 'useClipboard', 'useTemplateRef', 'useLocalStorage', 'useDebounceFn'];
const TOAST_IMPORT = "import { toast } from 'vue-sonner'";

// 检查文件是否使用了某个函数但没有导入
function needsImport(content, functionName) {
  // 检查是否使用了函数
  const usageRegex = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
  const hasUsage = usageRegex.test(content);
  
  if (!hasUsage) return false;
  
  // 检查是否已经导入
  const importRegex = new RegExp(`import.*\\b${functionName}\\b.*from`, 'g');
  const hasImport = importRegex.test(content);
  
  return !hasImport;
}

// 修复单个文件
function fixFile(filePath) {
  console.log(`🔧 修复文件: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let hasChanges = false;
  
  // 检查是否是 Vue 文件
  if (!content.includes('<script setup')) {
    return false;
  }
  
  // 需要添加的导入
  const neededVueImports = VUE_IMPORTS.filter(fn => needsImport(content, fn));
  const neededPiniaImports = PINIA_IMPORTS.filter(fn => needsImport(content, fn));
  const neededVueUseImports = VUEUSE_IMPORTS.filter(fn => needsImport(content, fn));
  const needsToast = needsImport(content, 'toast');
  
  // 查找 script setup 标签
  const scriptSetupMatch = content.match(/(<script setup[^>]*>)/);
  if (!scriptSetupMatch) {
    return false;
  }
  
  let insertPoint = scriptSetupMatch.index + scriptSetupMatch[0].length;
  let importsToAdd = [];
  
  // 添加 Vue 导入
  if (neededVueImports.length > 0) {
    importsToAdd.push(`import { ${neededVueImports.join(', ')} } from 'vue'`);
  }
  
  // 添加 Pinia 导入
  if (neededPiniaImports.length > 0) {
    importsToAdd.push(`import { ${neededPiniaImports.join(', ')} } from 'pinia'`);
  }
  
  // 添加 VueUse 导入
  if (neededVueUseImports.length > 0) {
    importsToAdd.push(`import { ${neededVueUseImports.join(', ')} } from '@vueuse/core'`);
  }
  
  // 添加 toast 导入
  if (needsToast) {
    importsToAdd.push(TOAST_IMPORT);
  }
  
  if (importsToAdd.length > 0) {
    const importString = '\n' + importsToAdd.join('\n') + '\n';
    newContent = content.slice(0, insertPoint) + importString + content.slice(insertPoint);
    hasChanges = true;
  }
  
  if (hasChanges) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ 已修复 ${filePath}`);
    return true;
  }
  
  return false;
}

// 扫描并修复所有 Vue 文件
function fixAllFiles() {
  console.log('🚀 开始批量修复 Vue 组合式 API 导入问题...');
  
  try {
    // 获取所有 Vue 文件
    const vueFiles = execSync('find src -name "*.vue" -type f', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    
    let fixedCount = 0;
    
    for (const file of vueFiles) {
      try {
        const fixed = fixFile(file);
        if (fixed) {
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ 修复 ${file} 失败:`, error.message);
      }
    }
    
    console.log(`🎉 修复完成！共修复 ${fixedCount} 个文件`);
    
    if (fixedCount > 0) {
      console.log('📋 修复的导入包括:');
      console.log('  - Vue 组合式 API (ref, computed, watch 等)');
      console.log('  - Pinia (storeToRefs)');
      console.log('  - VueUse (@vueuse/core)');
      console.log('  - Toast (vue-sonner)');
    }
    
    return fixedCount;
  } catch (error) {
    console.error('❌ 批量修复失败:', error.message);
    return 0;
  }
}

// 主函数
function main() {
  const fixedCount = fixAllFiles();
  
  if (fixedCount > 0) {
    console.log('\n🔄 运行类型检查...');
    try {
      execSync('npm run type-check', { stdio: 'inherit' });
      console.log('✅ 类型检查通过！');
    } catch (error) {
      console.log('⚠️ 类型检查仍有错误，但导入问题已修复');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { fixFile, fixAllFiles };
