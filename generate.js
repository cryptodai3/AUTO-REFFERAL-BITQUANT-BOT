const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cfonts = require('cfonts');
const inquirer = require('inquirer');
const fs = require('fs');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BOLD = '\x1b[1m';
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const API_KEY = 'AIzaSyBDdwO2O_Ose7LICa-A78qKJUCEE3nAwsM';
const DOMAIN = 'bitquant.io';
const URI = 'https://bitquant.io';
const VERSION = '1';
const CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:88.0) Gecko/20100101 Firefox/88.0',
  'Mozilla/5.0 (iPad; CPU OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 11; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function createSpinner() {
  let index = 0;
  let interval = null;
  let isActive = false;
  let currentText = '';
  let isUpdatingProgress = false;

  function clearLine() {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }

  return {
    start(text) {
      if (isActive) return;
      isActive = true;
      currentText = text;
      clearLine();
      process.stdout.write(`${CYAN}${SPINNER_FRAMES[index]} ${text}${RESET}`);
      interval = setInterval(() => {
        if (!isUpdatingProgress) {
          index = (index + 1) % SPINNER_FRAMES.length;
          clearLine();
          process.stdout.write(`${CYAN}${SPINNER_FRAMES[index]} ${currentText}${RESET}`);
        }
      }, 80);
    },
    updateProgress(text) {
      if (!isActive) return;
      isUpdatingProgress = true;
      clearLine();
      currentText = text;
      process.stdout.write(`${CYAN}${SPINNER_FRAMES[index]} ${text}${RESET}`);
      process.stdout.write('');
      isUpdatingProgress = false;
    },
    succeed(successText) {
      if (!isActive) return;
      clearInterval(interval);
      isActive = false;
      clearLine();
      process.stdout.write(`${GREEN}${BOLD}✔ ${successText}${RESET}\n`);
    },
    fail(failText) {
      if (!isActive) return;
      clearInterval(interval);
      isActive = false;
      clearLine();
      process.stdout.write(`${RED}✖ ${failText}${RESET}\n`);
    },
    stop() {
      if (!isActive) return;
      clearInterval(interval);
      isActive = false;
      clearLine();
    }
  };
}

function createProgressBar(current, total, width = 8) {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const percentage = Math.round((current / total) * 100);
  return `[${'■'.repeat(filled)}${'□'.repeat(empty)}] ${current}/${total} (${percentage}%)`;
}

function centerText(text) {
  const terminalWidth = process.stdout.columns || 80;
  const textLength = text.replace(/\x1b\[[0-9;]*m/g, '').length;
  const padding = Math.max(0, Math.floor((terminalWidth - textLength) / 2));
  return ' '.repeat(padding) + text;
}

cfonts.say('NT EXHAUST', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'black'],
});
console.log(centerText(`${BLUE}=== Telegram Channel 🚀 : NT EXHAUST ===${RESET}`));
console.log(centerText(`${CYAN}✪ BOT BITQUANT AUTO GENERATE REFERRAL ✪${RESET}\n`));

function readPrivateKeys(filename) {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n').map(line => line.trim()).filter(line => line !== '');
  } catch (err) {
    console.log(`${RED}Gagal membaca file wallet.txt: ${err.message}${RESET}`);
    return [];
  }
}

function readProxiesFromFile(filename) {
  try {
    const content = fs.readFileSync(filename, 'utf8');
    return content.split('\n').map(line => line.trim()).filter(line => line !== '');
  } catch (err) {
    console.log(`${RED}Gagal membaca file proxy.txt: ${err.message}${RESET}`);
    return [];
  }
}

function getGlobalHeaders(token = '', userAgent) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://www.bitquant.io',
    'Referer': 'https://www.bitquant.io/',
    'User-Agent': userAgent,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function generateMessage(address) {
  const nonce = Date.now();
  const issuedAt = new Date().toISOString();
  return `${DOMAIN} wants you to sign in with your **blockchain** account:\n${address}\n\nURI: ${URI}\nVersion: ${VERSION}\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

function signMessage(message, secretKey) {
  const messageBytes = Buffer.from(message, 'utf8');
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return bs58.encode(signature);
}

async function doLogin(wallet, axiosInstance, userAgent) {
  const spinner = createSpinner();
  spinner.start('Memproses login...');
  try {
    const message = generateMessage(wallet.address);
    const signature = signMessage(message, wallet.secretKey);
    const response = await axiosInstance.post(
      'https://quant-api.opengradient.ai/api/verify/solana',
      { address: wallet.address, message, signature },
      { headers: getGlobalHeaders('', userAgent) }
    );
    if (response.data.token) {
      spinner.succeed('  Login berhasil');
      return response.data.token;
    } else {
      spinner.fail(`  Login gagal: ${response.data.message || 'Respons API tidak valid'}`);
      return null;
    }
  } catch (error) {
    spinner.fail(`  Login gagal: ${error.response?.data?.message || error.message || 'Kesalahan tidak diketahui'}`);
    return null;
  }
}

async function getIdToken(token, axiosInstance, userAgent) {
  const spinner = createSpinner();
  spinner.start('Mendapatkan ID Token...');
  try {
    const response = await axiosInstance.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      { token, returnSecureToken: true },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
        }
      }
    );
    spinner.succeed('  ID Token berhasil didapatkan');
    return response.data.idToken;
  } catch (error) {
    spinner.fail(`  Gagal mendapatkan ID Token: ${error.response?.data?.message || error.message || 'Kesalahan tidak diketahui'}`);
    return null;
  }
}

async function generateReferralCode(axiosInstance, address, idToken, userAgent) {
  try {
    const response = await axiosInstance.post(
      'https://quant-api.opengradient.ai/api/invite/generate',
      { address },
      { headers: getGlobalHeaders(idToken, userAgent) }
    );
    if (response.data.invite_code) {
      return { success: true, code: response.data.invite_code };
    } else {
      return { success: false, code: null, message: 'Respons API tidak valid' };
    }
  } catch (error) {
    return { success: false, code: null, message: error.response?.data?.message || error.message || 'Kesalahan tidak diketahui' };
  }
}

async function saveReferralCode(code) {
  try {
    const existingCodes = fs.existsSync('code.txt') ? fs.readFileSync('code.txt', 'utf8').split('\n').filter(line => line.trim() !== '') : [];
    if (!existingCodes.includes(code)) {
      existingCodes.push(code);
      fs.writeFileSync('code.txt', existingCodes.join('\n') + '\n');
      return { success: true };
    } else {
      return { success: false, message: `Kode referral ${code} sudah ada di code.txt` };
    }
  } catch (error) {
    return { success: false, message: `Gagal menyimpan kode referral ${code} ke code.txt: ${error.message}` };
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    const privateKeys = readPrivateKeys('wallet.txt');
    if (privateKeys.length === 0) {
      console.log(`${RED}Tidak ada private key yang valid di wallet.txt${RESET}`);
      return;
    }

    let referralCount;
    while (true) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'count',
          message: `${CYAN}Masukkan jumlah generate kode referral untuk setiap akun: ${RESET}`,
          validate: (value) => {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed) || parsed <= 0) {
              return `${RED}Harap masukkan angka yang valid lebih dari 0!${RESET}`;
            }
            if (parsed > 25) {
              console.log();
              console.log(`${YELLOW}Peringatan: Jumlah kode referral besar ${parsed} dapat menyebabkan internal server error atau timeout..${RESET}`);
            }
            return true;
          }
        }
      ]);
      referralCount = parseInt(answer.count, 10);
      if (referralCount > 0) break;
    }

    const { useProxy } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useProxy',
        message: `${CYAN}Apakah Anda ingin menggunakan proxy?${RESET}`,
        default: false,
      }
    ]);

    let proxyList = [];
    let proxyMode = null;
    let axiosInstance = axios.create();
    if (useProxy) {
      const proxyAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'proxyType',
          message: `${CYAN}Pilih jenis proxy:${RESET}`,
          choices: ['Rotating', 'Static'],
        }
      ]);
      proxyMode = proxyAnswer.proxyType;
      proxyList = readProxiesFromFile('proxy.txt');
      if (proxyList.length > 0) {
        console.log(`${BLUE}Terdapat ${proxyList.length} proxy.${RESET}\n`);
      } else {
        console.log(`${YELLOW}File proxy.txt kosong atau tidak ditemukan, tidak menggunakan proxy.${RESET}\n`);
      }
    }

    console.log(`${YELLOW}\n=====================================================================================================${RESET}`);
    console.log(`${YELLOW}${BOLD}Memproses ${privateKeys.length} Akun untuk Generate ${referralCount} Kode Referral per Akun ..${RESET}`);
    console.log(`${YELLOW}Note: Untuk Menghindari Internal Server Error Mohon Generate 25 Kode Reff perhari${RESET}`);
    console.log(`${YELLOW}=======================================================================================================${RESET}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < privateKeys.length; i++) {
      console.log(`${CYAN}${BOLD}\n================================ ACCOUNT ${i + 1}/${privateKeys.length} ===============================${RESET}`);

      let selectedProxy = null;
      if (useProxy && proxyList.length > 0) {
        if (proxyMode === 'Rotating') {
          selectedProxy = proxyList[0];
        } else {
          selectedProxy = proxyList.shift();
          if (!selectedProxy) {
            console.log(`${RED}Tidak ada proxy yang tersisa untuk mode static.${RESET}`);
            return;
          }
        }
        console.log(`${WHITE}Menggunakan proxy: ${selectedProxy}${RESET}`);
        const agent = new HttpsProxyAgent(selectedProxy);
        axiosInstance = axios.create({ httpAgent: agent, httpsAgent: agent });
      } else {
        axiosInstance = axios.create();
      }

      const userAgent = getRandomUserAgent();

      let accountIP = '';
      try {
        const ipResponse = await axiosInstance.get('https://api.ipify.org?format=text', { headers: { 'User-Agent': userAgent } });
        accountIP = ipResponse.data.trim();
      } catch (error) {
        accountIP = 'Gagal mendapatkan IP';
        console.log(`${RED}Error saat mendapatkan IP: ${error.message}${RESET}`);
      }
      console.log(`${WHITE}IP Yang Digunakan: ${accountIP}${RESET}\n`);

      let wallet;
      try {
        const secretKey = bs58.decode(privateKeys[i]);
        const keypair = Keypair.fromSecretKey(secretKey);
        wallet = {
          address: keypair.publicKey.toBase58(),
          privateKey: privateKeys[i],
          secretKey: secretKey
        };
        console.log(`${GREEN}${BOLD}✔️  Wallet Solana Loaded: ${wallet.address}${RESET}`);
      } catch (error) {
        console.log(`${RED}✖  Private key tidak valid untuk akun ${i + 1}: ${error.message}${RESET}`);
        failCount++;
        console.log(`${YELLOW}\nProgress: ${i + 1}/${privateKeys.length} akun telah diproses. (Berhasil: ${successCount}, Gagal: ${failCount})${RESET}`);
        console.log(`${CYAN}${BOLD}====================================================================${RESET}\n`);
        continue;
      }

      const token = await doLogin(wallet, axiosInstance, userAgent);
      if (!token) {
        failCount++;
        console.log(`${YELLOW}\nProgress: ${i + 1}/${privateKeys.length} akun telah diproses. (Berhasil: ${successCount}, Gagal: ${failCount})${RESET}`);
        console.log(`${CYAN}${BOLD}====================================================================${RESET}\n`);
        continue;
      }

      const idToken = await getIdToken(token, axiosInstance, userAgent);
      if (!idToken) {
        failCount++;
        console.log(`${YELLOW}\nProgress: ${i + 1}/${privateKeys.length} akun telah diproses. (Berhasil: ${successCount}, Gagal: ${failCount})${RESET}`);
        console.log(`${CYAN}${BOLD}====================================================================${RESET}\n`);
        continue;
      }

      const spinner = createSpinner();
      let accountSuccessCount = 0;
      let errorLogs = [];
      let currentProgress = 0;
      const updateInterval = referralCount > 50 ? Math.ceil(referralCount / 20) : 1;

      spinner.start(`Membuat ${referralCount} kode referral... ${createProgressBar(currentProgress, referralCount)}`);
      await delay(200);

      for (let j = 0; j < referralCount; j++) {
        const genResult = await generateReferralCode(axiosInstance, wallet.address, idToken, userAgent);
        if (genResult.success) {
          const saveResult = await saveReferralCode(genResult.code);
          if (saveResult.success) {
            accountSuccessCount++;
          } else {
            errorLogs.push(`${YELLOW}${saveResult.message}${RESET}`);
          }
        } else {
          errorLogs.push(`${RED}${genResult.message}${RESET}`);
        }
        currentProgress++;
        if (currentProgress % updateInterval === 0 || currentProgress === referralCount) {
          spinner.updateProgress(`Membuat ${referralCount} kode referral... ${createProgressBar(currentProgress, referralCount)}`);
          await delay(200);
        }
        await delay(6000);
      }
      spinner.stop();
      console.log('');

      if (accountSuccessCount === referralCount) {
        console.log(`${GREEN}${BOLD}✔   ${accountSuccessCount} Refferal Created Successfully, Code Save in  code.txt${RESET}`);
        successCount++;
      } else {
        console.log(`${RED}✖   ${accountSuccessCount} dari ${referralCount} kode referral berhasil dibuat${RESET}`);
        if (errorLogs.length > 0) {
          console.log(`${CYAN}Log Error:${RESET}`);
          errorLogs.forEach(log => console.log(`  ${log}`));
        }
        failCount++;
      }

      console.log(`${YELLOW}\nProgress: ${i + 1}/${privateKeys.length} akun telah diproses. (Berhasil: ${successCount}, Gagal: ${failCount})${RESET}`);
      console.log(`${CYAN}${BOLD}====================================================================${RESET}\n`);

      if (i < privateKeys.length - 1) {
        const randomDelay = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
        const seconds = Math.floor(randomDelay / 1000);
        for (let s = seconds; s > 0; s--) {
          process.stdout.write(`\r${YELLOW}  Menunggu ${s} detik sebelum akun berikutnya... ${RESET}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('\r' + ' '.repeat(60) + '\r');
      }
    }

    console.log(`${BLUE}${BOLD}\nProses Done ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}.${RESET}`);
    console.log(`${BLUE}Berhasil: ${successCount}, Gagal: ${failCount}${RESET}`);
  } catch (error) {
    console.log(`${RED}Terjadi error fatal: ${error.message}${RESET}`);
  }
}

main();