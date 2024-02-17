#!/usr/bin/env node
import { exec } from 'child_process';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

// 获取当前文件的路径和目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 执行命令函数
function executeCommand(command, { silent = false } = {}) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (!silent) console.error(`执行命令出错: ${stderr}`);
                reject(stderr);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// 检查pnpm是否安装
async function checkAndInstallPnpm() {
    const spinner = ora('检查 pnpm 是否安装...').start();
    try {
        await executeCommand('pnpm --version', { silent: true });
        spinner.succeed(chalk.cyan('pnpm 已安装。'));
        return true;
    } catch (error) {
        spinner.warn(chalk.yellow('pnpm 未安装，尝试自动安装...'));
        try {
            await executeCommand('npm install -g pnpm');
            spinner.succeed(chalk.cyan('pnpm 安装成功。'));
            return true;
        } catch (installationError) {
            spinner.fail(chalk.red('pnpm 安装失败，请手动安装。'));
            return false;
        }
    }
}

// 检测并配置镜像源
async function configurePackageManagerSource() {
    const spinner = ora('配置镜像源...').start();
    const pnpmConfig = await executeCommand('pnpm config get registry', { silent: true });
    const npmConfig = await executeCommand('npm config get registry', { silent: true });
    const isPnpmCN = pnpmConfig.includes('registry.npmmirror.com');
    const isNpmCN = npmConfig.includes('registry.npmmirror.com');

    if (!isPnpmCN || !isNpmCN) {
        spinner.stop();
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'configure',
                message: '配置为国内镜像源以加速依赖安装吗？',
                default: true,
            }
        ]);
        if (answers.configure) {
            if (!isPnpmCN) await executeCommand('pnpm config set registry https://registry.npmmirror.com');
            if (!isNpmCN) await executeCommand('npm config set registry https://registry.npmmirror.com');
            console.log(chalk.cyan('镜像源配置完成。'));
        }
    } else {
        spinner.succeed(chalk.cyan('已配置国内镜像源。'));
    }
}

// 安装依赖
async function installDependencies() {
    const spinner = ora('正在安装依赖...').start();
    try {
        await executeCommand('pnpm install');
        spinner.succeed('依赖安装完成。');
    } catch (error) {
        spinner.fail('依赖安装失败。请查看错误信息并考虑向开发者社区反馈。');
        console.error(chalk.red(error));
    }
}

// 启动项目
async function startProject() {
    const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'start',
            message: '是否启动项目？',
            default: true,
        }
    ]);
    if (answers.start) {
        console.log(chalk.yellow('项目已启动，您可以在5秒后看到效果。如果没有，请手动在浏览器中打开 http://localhost:3000/'));
        await executeCommand('pnpm dev', { silent: false });
    }
}

// 主函数
async function main() {
    // 定义目标目录路径
    const targetDirectory = path.join(__dirname, 'wuhu-home-Caidan');

    // 检查目标目录是否存在
    if (!fs.existsSync(targetDirectory)) {
        console.error(chalk.red(`目标目录不存在: ${targetDirectory}`));
        return; // 如果目标目录不存在，则终止执行
    }

    // 尝试更改当前工作目录
    try {
        process.chdir(targetDirectory);
        console.log(chalk.greenBright(`成功进入项目目录: 🌻${targetDirectory}`));
    } catch (error) {
        console.error(chalk.red(`切换目录失败: ${error.message}`));
        return; // 如果无法切换目录，终止执行
    }

    if (!await checkAndInstallPnpm()) {
        return;
    }
    await configurePackageManagerSource();
    await installDependencies();
    await startProject();
}

main().catch(error => console.error(chalk.red(`执行脚本时出错: ${error}`)));
