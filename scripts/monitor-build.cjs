#!/usr/bin/env node

/**
 * GitHub Pages 构建监控器
 * 实时监控构建状态，自动检测和修复失败
 */

const https = require('https');
const { execSync } = require('child_process');

const REPO_OWNER = 'zillionare';
const REPO_NAME = 'marktwain';
const WORKFLOW_NAME = 'Deploy to GitHub Pages';

// GitHub API 请求
function githubRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: 'api.github.com',
      path: path,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'MarkTwain-Auto-Fix',
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`JSON 解析失败: ${error.message}`));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 获取最新的工作流运行
async function getLatestWorkflowRun() {
  try {
    const response = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=5`);

    // 查找部署工作流
    const deployRun = response.workflow_runs.find(run =>
      run.name === WORKFLOW_NAME || run.path.includes('deploy.yml')
    );

    return deployRun;
  } catch (error) {
    console.error(`❌ 获取工作流运行失败:`, error.message);
    return null;
  }
}

// 获取工作流运行的详细信息
async function getWorkflowRunDetails(runId) {
  try {
    const [run, jobs] = await Promise.all([
      githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}`),
      githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs`)
    ]);

    return { run, jobs: jobs.jobs };
  } catch (error) {
    console.error(`❌ 获取工作流详情失败:`, error.message);
    return null;
  }
}

// 分析构建失败原因
function analyzeBuildFailure(jobs) {
  const failedJobs = jobs.filter(job => job.conclusion === 'failure');
  const issues = [];

  for (const job of failedJobs) {
    const failedSteps = job.steps?.filter(step => step.conclusion === 'failure') || [];

    for (const step of failedSteps) {
      // 根据步骤名称推断问题类型
      if (step.name.includes('Install dependencies')) {
        issues.push({
          type: 'dependencies',
          step: step.name,
          job: job.name,
          description: '依赖安装失败，可能是 postinstall 脚本问题'
        });
      } else if (step.name.includes('Build') || step.name.includes('type-check')) {
        issues.push({
          type: 'build',
          step: step.name,
          job: job.name,
          description: '构建失败，可能是 TypeScript 错误或模块问题'
        });
      } else if (step.name.includes('Deploy')) {
        issues.push({
          type: 'deploy',
          step: step.name,
          job: job.name,
          description: '部署失败，可能是权限或配置问题'
        });
      }
    }
  }

  return issues;
}

// 应用自动修复
function applyAutoFix(issues) {
  console.log(`🔧 应用自动修复...`);

  try {
    // 运行自动修复脚本
    execSync('node scripts/auto-fix-build.cjs', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ 自动修复失败:`, error.message);
    return false;
  }
}

// 触发重新构建
async function triggerRebuild() {
  console.log(`🔄 触发重新构建...`);

  try {
    // 推送修复到远程仓库
    execSync('git push origin main', { stdio: 'inherit' });
    console.log(`✅ 修复已推送，将触发新的构建`);
    return true;
  } catch (error) {
    console.error(`❌ 推送失败:`, error.message);
    return false;
  }
}

// 监控构建状态
async function monitorBuild(runId, maxWaitTime = 600000) { // 10分钟超时
  const startTime = Date.now();

  console.log(`👀 监控构建 ${runId}...`);

  while (Date.now() - startTime < maxWaitTime) {
    const details = await getWorkflowRunDetails(runId);

    if (!details) {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
      continue;
    }

    const { run, jobs } = details;

    console.log(`📊 构建状态: ${run.status} | 结论: ${run.conclusion || '进行中'}`);

    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        console.log(`🎉 构建成功！`);
        console.log(`🌐 部署地址: https://${REPO_OWNER}.github.io/${REPO_NAME}`);
        return { success: true, run, jobs };
      } else if (run.conclusion === 'failure') {
        console.log(`❌ 构建失败`);

        // 分析失败原因
        const issues = analyzeBuildFailure(jobs);
        console.log(`📋 发现 ${issues.length} 个问题:`);
        issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.description} (${issue.step})`);
        });

        return { success: false, run, jobs, issues };
      }
    }

    // 等待30秒后再次检查
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  console.log(`⏰ 监控超时`);
  return { success: false, timeout: true };
}

// 主监控循环
async function main() {
  console.log(`🚀 GitHub Pages 构建监控器启动`);
  console.log(`📦 仓库: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`🔧 工作流: ${WORKFLOW_NAME}`);

  try {
    // 获取最新的构建
    const latestRun = await getLatestWorkflowRun();

    if (!latestRun) {
      console.log(`❌ 未找到部署工作流运行`);
      return;
    }

    console.log(`📋 最新构建: #${latestRun.run_number} (${latestRun.status})`);
    console.log(`🔗 查看详情: ${latestRun.html_url}`);

    // 如果构建正在进行中，监控它
    if (latestRun.status === 'in_progress' || latestRun.status === 'queued') {
      const result = await monitorBuild(latestRun.id);

      if (!result.success && result.issues) {
        console.log(`🔧 尝试自动修复...`);

        const fixed = applyAutoFix(result.issues);

        if (fixed) {
          const rebuilt = await triggerRebuild();

          if (rebuilt) {
            console.log(`🔄 已触发重新构建，请等待新的构建完成`);
          }
        }
      }
    } else if (latestRun.conclusion === 'failure') {
      console.log(`❌ 最新构建失败，尝试自动修复...`);

      const details = await getWorkflowRunDetails(latestRun.id);
      if (details) {
        const issues = analyzeBuildFailure(details.jobs);

        if (issues.length > 0) {
          const fixed = applyAutoFix(issues);

          if (fixed) {
            await triggerRebuild();
          }
        }
      }
    } else if (latestRun.conclusion === 'success') {
      console.log(`✅ 最新构建成功`);
      console.log(`🌐 在线地址: https://${REPO_OWNER}.github.io/${REPO_NAME}`);
    }

  } catch (error) {
    console.error(`❌ 监控失败:`, error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  getLatestWorkflowRun,
  monitorBuild,
  analyzeBuildFailure,
  applyAutoFix
};
