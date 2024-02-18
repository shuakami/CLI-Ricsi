#!/usr/bin/env node
import { exec } from 'child_process';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import i18n from 'i18next';
import i18next from "i18next";
import Backend from "i18next-fs-backend";

// 获取当前文件的路径和目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const languageFilePath = path.join(__dirname, 'lan.json');



// 初始化i18next
async function initI18Next(selectedLanguage) {
    await i18next.use(Backend).init({
        lng: selectedLanguage,
        fallbackLng: 'en',
        backend: {
            loadPath: path.join(__dirname, '{{lng}}.json'),
        },
    });
}

// 检查语言配置文件并加载语言
async function checkAndLoadLanguage() {
    let selectedLanguage = 'en';
    if (fs.existsSync(languageFilePath)) {
        const lanConfig = JSON.parse(fs.readFileSync(languageFilePath, 'utf-8'));
        selectedLanguage = lanConfig.language;
    } else {
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'language',
                message: 'Choose your language/选择你的语言/Выберите ваш язык:',
                choices: ['en', 'zh', 'ru'],
            },
        ]);
        fs.writeFileSync(languageFilePath, JSON.stringify({ language: answers.language }, null, 2), 'utf-8');
        selectedLanguage = answers.language;
    }
    await initI18Next(selectedLanguage);
}

// 执行命令函数
function executeCommand(command, { silent = false } = {}) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (!silent) console.error(i18n.t('execution_failed', { stderr }));
                reject(stderr);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

// 检查pnpm是否安装
async function checkAndInstallPnpm() {
    const spinner = ora(i18n.t('checking_pnpm_installed')).start();
    try {
        await executeCommand('pnpm --version', { silent: true });
        spinner.succeed(chalk.cyan(i18n.t('pnpm_already_installed')));
        return true;
    } catch (error) {
        spinner.warn(chalk.yellow(i18n.t('pnpm_not_installed_trying')));
        try {
            await executeCommand('npm install -g pnpm');
            spinner.succeed(chalk.cyan(i18n.t('pnpm_installation_success')));
            return true;
        } catch (installationError) {
            spinner.fail(chalk.red(i18n.t('pnpm_installation_failed')));
            return false;
        }
    }
}

// 检测并配置镜像源
async function configurePackageManagerSource() {
    const spinner = ora(i18n.t('configuring_mirror_source')).start();
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
                message: i18n.t('prompt_configure_mirror'),
                default: true,
            }
        ]);
        if (answers.configure) {
            if (!isPnpmCN) await executeCommand('pnpm config set registry https://registry.npmmirror.com');
            if (!isNpmCN) await executeCommand('npm config set registry https://registry.npmmirror.com');
            console.log(chalk.cyan(i18n.t('mirror_source_configuration_complete')));
        }
    } else {
        spinner.succeed(chalk.cyan(i18n.t('mirror_source_configured')));
    }
}

// 安装依赖
async function installDependencies() {
    const spinner = ora(i18n.t('installing_dependencies')).start();
    try {
        await executeCommand('pnpm install');
        spinner.succeed(i18n.t('dependencies_installation_complete'));
    } catch (error) {
        spinner.fail(i18n.t('dependencies_installation_failed'));
        console.error(chalk.red(error));
    }
}

// 启动项目
async function startProject() {
    const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'start',
            message: i18n.t('prompt_start_project'),
            default: true,
        }
    ]);
    if (answers.start) {
        console.log(chalk.yellow(i18n.t('project_started_info')));
        await executeCommand('pnpm dev', { silent: false });
    }
}

// 主函数
async function main() {
    await checkAndLoadLanguage();

    // 定义目标目录路径
    const targetDirectory = path.join(process.cwd(), 'wuhu-home-Caidan');

    // 检查目标目录是否存在
    if (!fs.existsSync(targetDirectory)) {
        console.error(chalk.red(i18n.t('target_directory_not_exist', { targetDirectory })));
        return; // 如果目标目录不存在，则终止执行
    }

    // 尝试更改当前工作目录
    try {
        process.chdir(targetDirectory);
        console.log(chalk.greenBright(i18n.t('entering_project_directory', { targetDirectory })));
    } catch (error) {
        console.error(chalk.red(i18n.t('changing_directory_failed', { message: error.message })));
        return; // 如果无法切换目录，终止执行
    }

    if (!await checkAndInstallPnpm()) {
        return;
    }
    await configurePackageManagerSource();
    await installDependencies();
    await startProject();
}

main().catch(error => console.error(chalk.red(i18n.t('execution_completed', { error }))));
