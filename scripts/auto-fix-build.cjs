#!/usr/bin/env node

/**
 * 自动修复 GitHub Pages 构建问题
 * 监控构建状态，自动识别和修复常见问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 常见构建问题和解决方案
const BUILD_FIXES = {
  // TypeScript 错误修复
  typescript: {
    patterns: [
      /Cannot find name '(\w+)'/,
      /Property '(\w+)' does not exist on type/,
      /Type '.*' is not assignable to type/
    ],
    fixes: [
      {
        pattern: /Cannot find name 'toast'/,
        action: 'addToastImport',
        description: '添加 toast 导入'
      },
      {
        pattern: /Property '\w+' does not exist on type.*storeRefs/,
        action: 'fixStoreRefs',
        description: '修复 store refs 类型问题'
      }
    ]
  },
  
  // 依赖安装错误修复
  dependencies: {
    patterns: [
      /simple-git-hooks.*command not found/,
      /wxt prepare.*command not found/,
      /postinstall.*exit code 127/
    ],
    fixes: [
      {
        pattern: /simple-git-hooks.*command not found/,
        action: 'skipPostinstall',
        description: '跳过 postinstall 脚本'
      }
    ]
  },
  
  // 构建配置错误修复
  build: {
    patterns: [
      /Module not found/,
      /Cannot resolve module/,
      /Unexpected token/
    ],
    fixes: [
      {
        pattern: /Module not found.*@\/utils\/toast/,
        action: 'fixToastModule',
        description: '修复 toast 模块路径'
      }
    ]
  }
};

// 修复操作实现
const FIXES = {
  // 添加 toast 导入
  addToastImport: (filePath) => {
    console.log(`🔧 修复文件: ${filePath} - 添加 toast 导入`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否已经导入了 toast
    if (content.includes("import { toast }") || content.includes("from '@/utils/toast'")) {
      console.log(`✅ ${filePath} 已经包含 toast 导入`);
      return false;
    }
    
    // 在 script setup 后添加 toast 导入
    const scriptSetupMatch = content.match(/(<script setup[^>]*>)/);
    if (scriptSetupMatch) {
      const importLine = "\nimport { toast } from '@/utils/toast'";
      const newContent = content.replace(
        scriptSetupMatch[1],
        scriptSetupMatch[1] + importLine
      );
      
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ 已为 ${filePath} 添加 toast 导入`);
      return true;
    }
    
    return false;
  },
  
  // 修复 store refs 类型问题
  fixStoreRefs: (filePath) => {
    console.log(`🔧 修复文件: ${filePath} - 修复 store refs 类型`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 添加类型断言
    const newContent = content.replace(
      /(\w+) = (\w+Refs)\.(\w+)/g,
      '$1 = ($2 as any).$3'
    );
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ 已修复 ${filePath} 的 store refs 类型问题`);
      return true;
    }
    
    return false;
  },
  
  // 跳过 postinstall 脚本
  skipPostinstall: () => {
    console.log(`🔧 修复 GitHub Actions - 跳过 postinstall 脚本`);
    
    const workflowPath = '.github/workflows/deploy.yml';
    const content = fs.readFileSync(workflowPath, 'utf8');
    
    if (content.includes('npm ci --ignore-scripts')) {
      console.log(`✅ GitHub Actions 已经配置跳过 postinstall`);
      return false;
    }
    
    const newContent = content.replace(
      'run: npm ci',
      'run: npm ci --ignore-scripts'
    );
    
    if (newContent !== content) {
      fs.writeFileSync(workflowPath, newContent);
      console.log(`✅ 已修复 GitHub Actions 配置`);
      return true;
    }
    
    return false;
  },
  
  // 修复 toast 模块路径
  fixToastModule: () => {
    console.log(`🔧 修复 toast 模块导出`);
    
    const toastIndexPath = 'src/utils/toast/index.ts';
    if (!fs.existsSync(toastIndexPath)) {
      // 创建 toast 导出文件
      const dir = path.dirname(toastIndexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(toastIndexPath, "export { toast } from 'vue-sonner'\n");
      console.log(`✅ 已创建 ${toastIndexPath}`);
      return true;
    }
    
    return false;
  }
};

// 扫描文件中的问题
function scanFileForIssues(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // 检查 TypeScript 问题
  for (const fix of BUILD_FIXES.typescript.fixes) {
    if (fix.pattern.test(content)) {
      issues.push({
        type: 'typescript',
        fix: fix.action,
        description: fix.description,
        file: filePath
      });
    }
  }
  
  return issues;
}

// 扫描项目中的潜在问题
function scanProject() {
  console.log(`🔍 扫描项目中的潜在构建问题...`);
  
  const issues = [];
  const vueFiles = execSync('find src -name "*.vue" -type f', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  for (const file of vueFiles) {
    const fileIssues = scanFileForIssues(file);
    issues.push(...fileIssues);
  }
  
  return issues;
}

// 应用修复
function applyFixes(issues) {
  console.log(`🔧 应用 ${issues.length} 个修复...`);
  
  let fixedCount = 0;
  
  for (const issue of issues) {
    const fixFunction = FIXES[issue.fix];
    if (fixFunction) {
      try {
        const fixed = fixFunction(issue.file);
        if (fixed) {
          fixedCount++;
          console.log(`✅ ${issue.description} - ${issue.file}`);
        }
      } catch (error) {
        console.error(`❌ 修复失败: ${issue.description} - ${error.message}`);
      }
    }
  }
  
  return fixedCount;
}

// 主函数
function main() {
  console.log(`🚀 GitHub Pages 自动修复工具启动`);
  
  try {
    // 扫描问题
    const issues = scanProject();
    
    if (issues.length === 0) {
      console.log(`✅ 未发现需要修复的问题`);
      return;
    }
    
    console.log(`📋 发现 ${issues.length} 个潜在问题:`);
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.description} - ${issue.file}`);
    });
    
    // 应用修复
    const fixedCount = applyFixes(issues);
    
    if (fixedCount > 0) {
      console.log(`🎉 成功修复 ${fixedCount} 个问题`);
      
      // 提交修复
      try {
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "fix: 自动修复构建问题\\n\\n🤖 自动修复工具应用的修复:\\n' + 
          issues.map(i => `- ${i.description}`).join('\\n') + '"', 
          { stdio: 'inherit' });
        console.log(`✅ 修复已提交到 Git`);
      } catch (error) {
        console.log(`⚠️ Git 提交失败，请手动提交修复`);
      }
    }
    
  } catch (error) {
    console.error(`❌ 自动修复失败:`, error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { scanProject, applyFixes, FIXES };
