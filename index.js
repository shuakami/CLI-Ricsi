#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function displayWelcomeMessage() {
    console.log(chalk.cyan(figlet.textSync('CLI-Ricsi', { font: 'Slant' })));
    console.log(chalk.cyan('Version: 1.0.0\nAuthor: @Shukami\n'));
    checkNodeEnvironment();
}

function checkNodeEnvironment() {
    const spinner = ora(chalk.yellow('正在检测Node.js环境...')).start();

    try {
        const nodeVersion = execSync('node -v').toString().trim();
        spinner.succeed(chalk.green(`检测到Node.js版本: ${nodeVersion}`));
        checkPackageManager('npm');
    } catch (error) {
        spinner.fail(chalk.red('未检测到Node.js环境，请安装Node.js'));
        console.log(chalk.yellow('请访问 https://nodejs.org/ 下载并安装Node.js'));
    }
}

function checkPackageManager(packageManager) {
    const spinner = ora(chalk.yellow(`正在检测${packageManager}环境...`)).start();

    try {
        const version = execSync(`${packageManager} --version`).toString().trim();
        spinner.succeed(chalk.green(`检测到${packageManager}版本: ${version}`));
        if (packageManager === 'npm') {
            checkPackageManager('pnpm');
        } else {
            detectNetworkEnvironment(); // After checking pnpm, proceed to network check
        }
    } catch (error) {
        spinner.fail(chalk.red(`未检测到${packageManager}环境`));
        offerPackageManagerInstallation(packageManager);
    }
}

function offerPackageManagerInstallation(packageManager) {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'install',
            message: `未检测到${packageManager}，是否尝试自动安装?`,
            default: true,
        }
    ]).then((answers) => {
        if (answers.install) {
            installPackageManager(packageManager);
        } else {
            console.log(chalk.yellow(`请手动安装${packageManager}。`));
            if (packageManager === 'npm') {
                checkPackageManager('pnpm'); // Skip to next check
            } else {
                detectNetworkEnvironment(); // Proceed to network check
            }
        }
    });
}

function installPackageManager(packageManager) {
    const spinner = ora(chalk.yellow(`尝试安装${packageManager}...`)).start();
    let installCommand;

    if (packageManager === 'npm') {
        // npm is usually installed with Node.js; this is just for example
        installCommand = 'curl -L https://www.npmjs.com/install.sh | sh';
    } else if (packageManager === 'pnpm') {
        installCommand = 'npm install -g pnpm';
    }

    exec(installCommand, (error) => {
        if (error) {
            spinner.fail(chalk.red(`${packageManager}安装失败，请尝试手动安装。`));
            console.log(chalk.yellow(`访问${packageManager}官网获取安装指导。`));
            if (packageManager === 'npm') {
                checkPackageManager('pnpm'); // Skip to next check
            } else {
                detectNetworkEnvironment(); // Proceed to network check
            }
        } else {
            spinner.succeed(chalk.green(`${packageManager}安装成功。`));
            if (packageManager === 'npm') {
                checkPackageManager('pnpm'); // Next check
            } else {
                detectNetworkEnvironment(); // Proceed to network check
            }
        }
    });
}

const urls = ['github.com', 'baidu.com', 'google.com', 'cn.bing.com'];
let networkStatus = { 'github.com': false, 'baidu.com': false, 'google.com': false, 'cn.bing.com': false };

async function checkNetwork(url) {
    return new Promise((resolve) => {
        // 根据操作系统选择适当的命令
        const command = process.platform === "win32" ?
            `ping -n 1 -w 150 ${url}` : // 对于Windows系统
            `ping -c 1 -W 1 ${url}`; // 对于Unix/Linux系统

        exec(command, (error) => {
            networkStatus[url] = !error;
            resolve(!error);
        });
    });
}


async function detectNetworkEnvironment() {
    const spinner = ora(chalk.yellow('正在检测网络环境...')).start();
    await Promise.all(urls.map(url => checkNetwork(url)));
    spinner.stop();

    // 判断网络环境
    const isInternational = networkStatus['github.com'] && networkStatus['google.com'];

    if (isInternational) {
        console.log(chalk.green('🎉检测到国外网络环境，使用GitHub原始仓库源。'));
        cloneRepository('https://github.com/shuakami/wuhu-home-Caidan.git');
    } else {
        console.log(chalk.green('🐳检测到国内网络环境，使用国内镜像源。'));
        cloneRepository('https://githubfast.com/shuakami/wuhu-home-Caidan.git');
    }
}


function cloneRepository(repoUrl) {
    const repoName = repoUrl.split('/').pop().replace('.git', ''); // 获取仓库名，并去除.git后缀
    const spinner = ora(chalk.yellow(`正在从 ${repoUrl} 拉取仓库 ${repoName}...`)).start();

    if (fs.existsSync(repoName)) {
        spinner.warn(chalk.yellow(`${repoName} 仓库已存在。`));
        inquirer.prompt([
            {
                type: 'confirm',
                name: 'deleteAndClone',
                message: '您已经拉取过该仓库。要删除并重新拉取吗？',
                default: false,
            }
        ]).then((answers) => {
            if (answers.deleteAndClone) {
                fs.rmSync(repoName, { recursive: true, force: true }); // 使用fs删除已存在的仓库文件夹
                executeGitClone(repoUrl, spinner);
            } else {
                // 检测仓库完整性的选项
                inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'checkIntegrity',
                        message: '要检测现有仓库的完整性吗？（注：如果你已经安装过依赖，不要尝试此选项，会导致你卡死）',
                        default: true,
                    }
                ]).then((answers) => {
                    if (answers.checkIntegrity) {
                        checkRepoIntegrity(repoName, repoUrl, spinner);
                    } else {
                        spinner.info(chalk.yellow('保留现有仓库，未进行任何操作。'));
                        executeNextStep(); // 确保在此分支也调用executeNextStep继续执行后续步骤
                    }
                });
            }
        });
    } else {
        executeGitClone(repoUrl, spinner);
    }
}

function checkRepoIntegrity(repoName, repoUrl, spinner) {
    try {
        const directoryMD5 = calculateDirectoryMD5(repoName);
        const expectedMD5 = "467bcf27a0716dc3b48905cb87ca993f";
        if (directoryMD5 === expectedMD5) {
            spinner.succeed(chalk.green('仓库完整性通过MD5哈希检测。'));
            executeNextStep(); // 完整性检查通过后继续
        } else {
            throw new Error('哈希值不匹配');
        }
    } catch (error) {
        console.warn(chalk.yellow(`MD5检测失败: ${error.message}，正在尝试目录大小和文件数量检测...`));
        const { fileCount, totalSize } = getDirectoryStats(repoName);
        const expectedSizeLowerBound = 21500000; // 21.5 MB
        const expectedSizeUpperBound = 22609920; // 22.60992 MB
        const expectedFileCount = 111;

        if (totalSize >= expectedSizeLowerBound && totalSize <= expectedSizeUpperBound && fileCount >= expectedFileCount) {
            spinner.succeed(chalk.green('仓库完整性通过目录大小和文件数量检测。'));
            executeNextStep(); // 即使通过目录大小和文件数量检测，也继续执行
        } else {
            promptForReclone(spinner, repoName, repoUrl);
        }
    }
}

function promptForReclone(spinner, repoName, repoUrl) {
    spinner.warn(chalk.yellow('仓库可能不完整，是否重新拉取？'));
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'reClone',
            message: '要删除当前仓库并重新拉取吗？',
            default: false,
        }
    ]).then((answers) => {
        if (answers.reClone) {
            fs.rmSync(repoName, { recursive: true, force: true });
            executeGitClone(repoUrl, spinner);
        } else {
            executeNextStep(); // 即使用户决定不重新拉取，也应继续执行
        }
    });
}




function getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;

    function calculateStats(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                calculateStats(filePath);
            } else {
                fileCount += 1;
                totalSize += stat.size;
            }
        }
    }

    calculateStats(dirPath);
    return { fileCount, totalSize };
}

function calculateDirectoryMD5(directoryPath) {
    let hashes = '';

    function calculateFileHash(filePath) {
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('md5');
        hashSum.update(fileBuffer);
        const hex = hashSum.digest('hex');
        return hex;
    }

    function readDirectory(directory) {
        const items = fs.readdirSync(directory);
        for (const item of items) {
            const fullPath = path.join(directory, item);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                readDirectory(fullPath);
            } else {
                hashes += calculateFileHash(fullPath) + '\n';
            }
        }
    }

    readDirectory(directoryPath);
    const combinedHash = crypto.createHash('md5').update(hashes).digest('hex');
    return combinedHash;
}


function executeGitClone(repoUrl, spinner) {
    spinner.text = `正在从 ${repoUrl} 拉取仓库...`;
    spinner.start();

    exec(`git clone ${repoUrl}`, (error) => {
        if (error) {
            spinner.fail(chalk.red(`仓库拉取失败，请检查git配置或网络连接。错误信息：${error.message}`));
            executeNextStep(); // 即使拉取失败，也确保调用executeNextStep继续执行
        } else {
            spinner.succeed(chalk.green('仓库成功拉取。'));
            executeNextStep(); // 拉取成功后继续执行
        }
    });
}


function executeNextStep() {
    console.log(chalk.cyan('开始执行安装部分...'));
    const scriptPath = path.join(__dirname, 'step1.js');
    const subprocess = spawn('node', [scriptPath], { stdio: 'inherit' });

    subprocess.on('close', (code) => {
        if (code === 0) {
            console.log(chalk.green('执行完成'));
        } else {
            console.error(chalk.red(`子进程退出码：${code}`));
        }
    });
}
displayWelcomeMessage();
