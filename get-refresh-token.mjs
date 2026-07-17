/**
 * Spotify Refresh Token Generator
 * รันครั้งเดียวเพื่อเอา Refresh Token มาใส่ .env
 *
 * วิธีใช้:
 *   1. ปิด Vite dev server ก่อน (ถ้ารันอยู่)
 *   2. node get-refresh-token.mjs
 *   3. Login Spotify ใน Browser ที่เปิดขึ้นมา
 *   4. Copy Refresh Token ที่ได้ไปใส่ .env
 */

import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const REDIRECT_URI = process.argv[2] || "http://localhost:5173/callback";
const PORT = 5173;
const IS_NGROK = !REDIRECT_URI.startsWith("http://localhost");

const SCOPES = [
  "user-read-recently-played",
  "user-top-read",
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

// ─── Read .env ─────────────────────────────────────────────────────────────────

function readEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return {};

  const vars = {};
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) return;
      const key = line.slice(0, eqIndex).trim();
      const value = line
        .slice(eqIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      vars[key] = value;
    });
  return vars;
}

function writeEnvValue(key, value) {
  const envPath = path.join(__dirname, ".env");
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    // อัปเดต key ที่มีอยู่แล้ว
    content = content.replace(regex, `${key}=${value}`);
  } else {
    // เพิ่ม key ใหม่
    if (content.length > 0 && !content.endsWith("\n")) {
      content += "\n";
    }
    content += `${key}=${value}\n`;
  }

  fs.writeFileSync(envPath, content, "utf-8");
}

// ─── Open Browser ──────────────────────────────────────────────────────────────

function openBrowser(url) {
  const platform = process.platform;
  let cmd;

  if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log("⚠️  ไม่สามารถเปิด Browser อัตโนมัติได้");
    }
  });
}

// ─── Exchange Code → Tokens ───────────────────────────────────────────────────

async function exchangeCodeForTokens(code, clientId, clientSecret) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  return response.json();
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

// ─── HTML Responses ───────────────────────────────────────────────────────────

const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Spotify Auth</title>
  <style>
    body { font-family: sans-serif; background: #121212; color: #fff; display: flex;
           align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e1e1e; border-radius: 12px; padding: 40px; text-align: center; }
    .icon { font-size: 64px; }
    h1 { color: #1DB954; }
    p { color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>สำเร็จ!</h1>
    <p>ปิดหน้าต่างนี้แล้วดูผลลัพธ์ใน Terminal ได้เลย</p>
  </div>
</body>
</html>`;

const errorHtml = (msg) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Spotify Auth Error</title>
  <style>
    body { font-family: sans-serif; background: #121212; color: #fff; display: flex;
           align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e1e1e; border-radius: 12px; padding: 40px; text-align: center; }
    .icon { font-size: 64px; }
    h1 { color: #e74c3c; }
    p { color: #aaa; }
    code { background: #333; padding: 4px 8px; border-radius: 4px; color: #e74c3c; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>เกิดข้อผิดพลาด</h1>
    <p><code>${msg}</code></p>
    <p>ดูรายละเอียดเพิ่มเติมใน Terminal</p>
  </div>
</body>
</html>`;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   🎵  Spotify Refresh Token Generator     │");
  console.log("└──────────────────────────────────────────┘\n");

  // อ่าน credentials จาก .env
  const env = readEnv();
  const CLIENT_ID = env.VITE_SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = env.VITE_SPOTIFY_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      "❌  ไม่พบ VITE_SPOTIFY_CLIENT_ID หรือ VITE_SPOTIFY_CLIENT_SECRET ใน .env\n",
    );
    console.error("   กรุณาเพิ่มในไฟล์ .env ก่อน:");
    console.error("   VITE_SPOTIFY_CLIENT_ID=your_client_id");
    console.error("   VITE_SPOTIFY_CLIENT_SECRET=your_client_secret\n");
    process.exit(1);
  }

  console.log(
    `✅  โหลด Client ID: ${CLIENT_ID.slice(0, 8)}${"*".repeat(CLIENT_ID.length - 8)}`,
  );

  // สร้าง Auth URL
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("show_dialog", "true");

  console.log("\n📋  Scopes ที่ขอสิทธิ์:");
  SCOPES.split(" ").forEach((s) => console.log(`    • ${s}`));

  console.log(`\n📡  Redirect URI: ${REDIRECT_URI}`);

  // รอรับ code จาก callback
  const tokensPromise = new Promise((resolve, reject) => {
    function handleCallback(code, error) {
      if (error) {
        reject(new Error(`Spotify denied access: ${error}`));
        return;
      }
      if (!code) {
        reject(new Error("No authorization code received"));
        return;
      }

      console.log("\n🔄  ได้รับ code แล้ว กำลังแลกเปลี่ยนเป็น Token...");

      exchangeCodeForTokens(code, CLIENT_ID, CLIENT_SECRET)
        .then((tokens) => {
          if (tokens.error) {
            reject(new Error(tokens.error_description || tokens.error));
            return;
          }
          resolve(tokens);
        })
        .catch(reject);
    }

    if (IS_NGROK) {
      // ─── Mode: ngrok ─────────────────────────────────────────────
      // ไม่ต้องเปิด server เอง เพราะ ngrok จะ forward มาที่ Vite
      // แต่ต้องการ local server เล็กๆ รับ callback แทน Vite
      // ใช้ port สำรอง 5174
      const callbackServer = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(error ? errorHtml(error) : successHtml);
        callbackServer.close();
        handleCallback(code, error);
      });

      callbackServer.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(`\n❌  Port ${PORT} ถูกใช้งานอยู่แล้ว`);
          console.error(
            "   กรุณาปิด Vite dev server ก่อน แล้วรัน script ใหม่\n",
          );
        } else {
          console.error(`\n❌  Server error: ${err.message}\n`);
        }
        reject(err);
        process.exit(1);
      });

      callbackServer.listen(PORT, () => {
        console.log(
          `\n🌐  Server รอรับ callback ที่ port ${PORT} (ngrok → localhost:${PORT})`,
        );
        console.log("\n🚀  กำลังเปิด Browser...");
        console.log(`   ถ้า Browser ไม่เปิดอัตโนมัติ ให้เปิด URL นี้เอง:\n`);
        console.log(`   ${authUrl.toString()}\n`);
        openBrowser(authUrl.toString());
      });
    } else {
      // ─── Mode: localhost ──────────────────────────────────────────
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(error ? errorHtml(error) : successHtml);
        server.close();
        handleCallback(code, error);
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(`\n❌  Port ${PORT} ถูกใช้งานอยู่แล้ว`);
          console.error(
            "   กรุณาปิด Vite dev server ก่อน แล้วรัน script ใหม่\n",
          );
        } else {
          console.error(`\n❌  Server error: ${err.message}\n`);
        }
        reject(err);
        process.exit(1);
      });

      server.listen(PORT, () => {
        console.log(`\n🌐  Server รอรับ callback ที่ port ${PORT}`);
        console.log("\n🚀  กำลังเปิด Browser...");
        console.log(`   ถ้า Browser ไม่เปิดอัตโนมัติ ให้เปิด URL นี้เอง:\n`);
        console.log(`   ${authUrl.toString()}\n`);
        openBrowser(authUrl.toString());
      });
    }
  });

  // รอผล
  let tokens;
  try {
    tokens = await tokensPromise;
  } catch (err) {
    console.error("\n❌  เกิดข้อผิดพลาด:", err.message, "\n");
    process.exit(1);
  }

  // แสดงผลลัพธ์
  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   ✅  ได้ Refresh Token มาแล้ว!           │");
  console.log("└──────────────────────────────────────────┘\n");
  console.log("VITE_SPOTIFY_REFRESH_TOKEN=" + tokens.refresh_token);
  console.log("\n──────────────────────────────────────────\n");

  // ถามว่าจะบันทึกลง .env อัตโนมัติไหม
  const answer = await prompt(
    "💾  ต้องการบันทึก Refresh Token ลงใน .env อัตโนมัติเลยไหม? (y/n): ",
  );

  if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    writeEnvValue("VITE_SPOTIFY_REFRESH_TOKEN", tokens.refresh_token);
    console.log("\n✅  บันทึกลงใน .env เรียบร้อย!\n");
    console.log(
      "   ขั้นตอนต่อไป: แก้ไข spotify.ts ให้ใช้ Refresh Token แทน Client Credentials\n",
    );
  } else {
    console.log("\n📋  Copy บรรทัดนี้ไปใส่ใน .env ของคุณด้วยตัวเอง:\n");
    console.log(`   VITE_SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  }

  process.exit(0);
}

main();
