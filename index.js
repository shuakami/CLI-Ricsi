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
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

async function displayWelcomeMessage() {
    await checkAndLoadLanguage();
    console.log(chalk.cyan(figlet.textSync(i18next.t('welcome_message'), { font: 'Slant' })));
    console.log(chalk.cyan(`${i18next.t('version')}\n${i18next.t('author')}\n`));
    checkNodeEnvironment();
}


function checkNodeEnvironment() {
    const spinner = ora(chalk.yellow(i18next.t('checking_node'))).start();

    try {
        const nodeVersion = execSync('node -v').toString().trim();
        spinner.succeed(chalk.green(i18next.t('node_detected', { version: nodeVersion })));
        checkPackageManager('npm');
    } catch (error) {
        spinner.fail(chalk.red(i18next.t('node_not_detected')));
        console.log(chalk.yellow(i18next.t('visit_node_website')));
    }
}

function checkPackageManager(packageManager) {
    const spinner = ora(chalk.yellow(i18next.t('checking_node', { packageManager: packageManager }))).start();

    try {
        const version = execSync(`${packageManager} --version`).toString().trim();
        spinner.succeed(chalk.green(i18next.t('execution_completed', { packageManager: packageManager, version: version })));
        if (packageManager === 'npm') {
            checkPackageManager('pnpm');
        } else {
            detectNetworkEnvironment(); // 继续网络环境检测
        }
    } catch (error) {
        spinner.fail(chalk.red(i18next.t('package_manager_not_detected', { packageManager: packageManager })));
        offerPackageManagerInstallation(packageManager);
    }
}

function offerPackageManagerInstallation(packageManager) {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'install',
            message: i18next.t('try_auto_install', { packageManager: packageManager }),
            default: true,
        }
    ]).then((answers) => {
        if (answers.install) {
            installPackageManager(packageManager);
        } else {
            console.log(chalk.yellow(i18next.t('manual_install_suggestion', { packageManager: packageManager })));
            if (packageManager === 'npm') {
                checkPackageManager('pnpm'); // 跳过npm，检查pnpm
            } else {
                detectNetworkEnvironment(); // 继续网络环境检测
            }
        }
    });
}

function installPackageManager(packageManager) {
    const spinner = ora(chalk.yellow(i18next.t('installing_package_manager', { packageManager }))).start();
    let installCommand;

    if (packageManager === 'npm') {
        installCommand = 'curl -L https://www.npmjs.com/install.sh | sh';
    } else if (packageManager === 'pnpm') {
        installCommand = 'npm install -g pnpm';
    }

    exec(installCommand, (error) => {
        if (error) {
            spinner.fail(chalk.red(i18next.t('installation_failed', { packageManager })));
            console.log(chalk.yellow(i18next.t('manual_install_suggestion', { packageManager })));
            if (packageManager === 'npm') {
                checkPackageManager('pnpm'); // Skip to next check
            } else {
                detectNetworkEnvironment(); // Proceed to network check
            }
        } else {
            spinner.succeed(chalk.green(i18next.t('installation_succeeded', { packageManager })));
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
        const command = process.platform === "win32" ?
            `ping -n 1 -w 150 ${url}` : // For Windows systems
            `ping -c 1 -W 1 ${url}`; // For Unix/Linux systems

        exec(command, (error) => {
            networkStatus[url] = !error;
            resolve(!error);
        });
    });
}

async function detectNetworkEnvironment() {
    const spinner = ora(chalk.yellow(i18next.t('checking_network'))).start();
    await Promise.all(urls.map(url => checkNetwork(url)));
    spinner.stop();

    const isInternational = networkStatus['github.com'] && networkStatus['google.com'];

    if (isInternational) {
        console.log(chalk.green(i18next.t('international_network_detected')));
        cloneRepository('https://github.com/shuakami/wuhu-home-Caidan.git');
    } else {
        console.log(chalk.green(i18next.t('domestic_network_detected')));
        cloneRepository('https://githubfast.com/shuakami/wuhu-home-Caidan.git');
    }
}

function cloneRepository(repoUrl) {
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const spinner = ora(chalk.yellow(i18next.t('starting_installation', { repoUrl, repoName }))).start();

    if (fs.existsSync(repoName)) {
        spinner.warn(chalk.yellow(i18next.t('repository_exists', { repoName })));
        inquirer.prompt([
            {
                type: 'confirm',
                name: 'deleteAndClone',
                message: i18next.t('delete_and_reclone'),
                default: false,
            }
        ]).then((answers) => {
            if (answers.deleteAndClone) {
                fs.rmSync(repoName, { recursive: true, force: true });
                executeGitClone(repoUrl, spinner);
            } else {
                inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'checkIntegrity',
                        message: i18next.t('check_integrity'),
                        default: true,
                    }
                ]).then((answers) => {
                    if (answers.checkIntegrity) {
                        checkRepoIntegrity(repoName, repoUrl, spinner);
                    } else {
                        spinner.info(chalk.yellow(i18next.t('keeping_existing_repo')));
                        executeNextStep();
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
            spinner.succeed(chalk.green(i18next.t('repo_integrity_passed')));
            executeNextStep();
        } else {
            throw new Error(i18next.t('hash_mismatch'));
        }
    } catch (error) {
        spinner.warn(chalk.yellow(i18next.t('md5_check_failed', { message: error.message })));

        const expectedSizeLowerBound = 21500000; // 21.5 MB
        const expectedSizeUpperBound = 22609920; // 22.60992 MB
        const expectedFileCount = 111;

        const { fileCount, totalSize } = getDirectoryStats(repoName);
        if (totalSize >= expectedSizeLowerBound && totalSize <= expectedSizeUpperBound && fileCount >= expectedFileCount) {
            spinner.succeed(chalk.green(i18next.t('size_and_count_check_passed')));
            executeNextStep();
        } else {
            promptForReclone(spinner, repoName, repoUrl);
        }
    }
}

function promptForReclone(spinner, repoName, repoUrl) {
    spinner.warn(chalk.yellow(i18next.t('repo_may_be_incomplete')));
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'reClone',
            message: i18next.t('delete_and_repull'),
            default: false,
        }
    ]).then((answers) => {
        if (answers.reClone) {
            fs.rmSync(repoName, { recursive: true, force: true });
            executeGitClone(repoUrl, spinner);
        } else {
            executeNextStep(); // Even if the user decides not to re-clone, continue execution
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
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const cloneDirectory = path.join(process.cwd(), repoName); // 目标克隆目录设置为当前工作目录下

    spinner.text = i18next.t('cloning_repository', { repoUrl });
    spinner.start();

    // 检查目标目录是否已存在
    if (fs.existsSync(cloneDirectory)) {
        spinner.fail(chalk.yellow(i18next.t('repository_already_exists', { repoName })));
        return; // 如果目标目录已存在，则停止执行
    }

    exec(`git clone ${repoUrl} "${cloneDirectory}"`, (error) => { // 注意：这里添加了克隆的目标路径
        if (error) {
            spinner.fail(chalk.red(i18next.t('clone_failed', { errorMessage: error.message })));
            executeNextStep(); // 确保执行继续，即使克隆失败
        } else {
            spinner.succeed(chalk.green(i18next.t('clone_success')));
            executeNextStep(); // 克隆成功后继续执行
        }
    });
}



function executeNextStep() {
    console.log(chalk.cyan(i18next.t('starting_installation')));
    const scriptPath = path.join(__dirname, 'step1.js');
    const subprocess = spawn('node', [scriptPath], { stdio: 'inherit' });

    subprocess.on('close', (code) => {
        if (code === 0) {
            console.log(chalk.green(i18next.t('execution_completed')));
        } else {
            console.error(chalk.red(i18next.t('subprocess_exit_code', { code })));
        }
    });
}

displayWelcomeMessage();
