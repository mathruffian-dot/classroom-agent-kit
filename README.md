# Google Classroom Agent & Web Sync Kit 🔗

This kit contains a dual-channel integration system for Google Classroom:
1. **Web Frontend Synchronization**: Client-side Google OAuth 2.0 (Google Identity Services) for multi-account compatibility without server session conflicts.
2. **Terminal CLI Control**: A Node.js command-line interface (`classroom-cli`) allowing local AI coding assistants (like Antigravity, Claude Code, Cline, etc.) to list courses, import student rosters, list coursework, and post announcements directly from the chat prompt.

---

## 📂 Project Structure

```
├── index.html          # Web UI with integrated Google Classroom login popup
├── app.js              # Client-side OAuth flow and Classroom REST API calling logic
├── style.css           # Styling guidelines for the Classroom panels
├── classroom-cli.js    # CLI Script for local API interaction
└── package.json        # Node.js dependencies and bin path mapping
```

---

## ⚙️ Google Cloud Platform Configuration (For Setup)

To use either the web interface or the CLI command, you must configure credentials in the [Google Cloud Console](https://console.cloud.google.com/):

### 1. Enable Classroom API
- Search for `Google Classroom API` in your project search bar and click **Enable**.
- Go to `OAuth Consent Screen` (OAuth 同意畫面) -> Select **External** -> Add your test Google accounts in **Test Users** (important for developer status).
- Ensure scopes `classroom.courses.readonly`, `classroom.rosters.readonly`, and `classroom.announcements` (or `classroom.coursework.me` / `classroom.coursework.students` for coursework) are added.

### 2. OAuth Credentials Setup

#### A. Web App Client ID (For Browser Sync)
- Go to `Credentials` -> **Create Credentials** -> **OAuth client ID** -> select **Web application**.
- Under **Authorized JavaScript origins**, add your local address (`http://localhost:5500`) and your production Netlify address (`https://your-app.netlify.app`).
- Copy the generated Web Client ID and paste it in the Web UI to sync.

#### B. Desktop App Client ID (For CLI Control)
- Go to `Credentials` -> **Create Credentials** -> **OAuth client ID** -> select **Desktop application**.
- Save the client ID. Download the generated credentials JSON.
- Rename the downloaded JSON file to **`credentials.json`** and save it in the same directory as `classroom-cli.js`.

---

## 💻 Web App OAuth Flow Integration (`app.js`)

The web app integrates with the new **Google Identity Services (GIS)** to request authorization tokens directly in-browser. This avoids browser session conflicts when teachers are signed into multiple Google accounts.

```javascript
let googleAccessToken = null;

// Initialize GIS Token client
const tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: "YOUR_GOOGLE_CLIENT_ID",
  scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly",
  callback: (tokenResponse) => {
    if (tokenResponse && tokenResponse.access_token) {
      googleAccessToken = tokenResponse.access_token;
      // You can now query endpoints using Authorization headers
    }
  }
});

// Trigger login popup
tokenClient.requestAccessToken({ prompt: "consent" });
```

---

## ⌨️ CLI Agent Tool Installation & Usage

You can link the script globally to let your terminal or coding agents execute commands anywhere.

### 1. Installation
Install Node.js dependencies:
```bash
npm install
```

### 2. Global Symlink
Create a global symlink on your local machine:
```bash
npm link
```

### 3. CLI Commands
Run commands directly from the terminal. If you are using an AI Agent, the agent can call these commands to fetch info or write updates on your behalf:

* **Authentication (Run Once)**:
  ```bash
  classroom-cli auth
  ```
  *(Opens the browser to request login. Saves OAuth access tokens to `token.json`)*

* **List Active Courses**:
  ```bash
  classroom-cli list-courses
  ```

* **List Course Student Roster**:
  ```bash
  classroom-cli list-students <courseId>
  ```

* **Create a Course Assignment**:
  ```bash
  classroom-cli create-assignment <courseId> "Assignment Title" "Assignment Instructions/Description"
  ```

* **Post a Stream Announcement**:
  ```bash
  classroom-cli post-announcement <courseId> "Announcement Text"
  ```

* **List Course Assignments (Coursework)**:
  ```bash
  classroom-cli list-coursework <courseId>
  ```

---

## 🩺 安裝疑難排解（Troubleshooting）

依「最常踩」排序，安裝／首次授權時若卡住先看這裡：

### 1. CLI 憑證一定要選「桌面應用程式」類型
`classroom-cli` 透過 `@google-cloud/local-auth` 授權，**只吃 Desktop application 類型的 OAuth 憑證**。
若誤用 Web application 那組，授權會失敗或拿不到 refresh token。下載後務必改名為 **`credentials.json`**，
放在與 `classroom-cli.js` **同一層目錄**（程式以 `__dirname` 定位，放錯就會報 `credentials.json is missing`）。
> 注意：CLI（Desktop）與網頁端（Web App）用的是**兩組不同的 Client ID**，不要互換。

### 2. OAuth 同意畫面在「測試中」→ 必須把自己加進 Test Users
同意畫面選 External 後，**要把你要登入的 Google 帳號加到 Test Users 名單**，否則 `classroom-cli auth`
會被擋（`access_denied` / 未通過驗證）。使用學校 Google Workspace 帳號時，若網域管理員鎖定第三方
App 存取，個人將無法授權，需請管理員開放或改用一般 Gmail 測試。

### 3. 改了 Scope 之後，務必刪掉舊的 `token.json` 再重新授權
本 CLI 需要以下 5 個 scope（缺了會在跑 `post-announcement` / `create-assignment` 時噴 403）：
`classroom.courses.readonly`、`classroom.rosters.readonly`、`classroom.announcements`、
`classroom.coursework.me`、`classroom.coursework.students`。
程式只要偵測到 `token.json` 存在就會沿用舊權限，**改 scope 後不會自動更新**，
因此調整 scope 後請：
```bash
# 刪掉舊 token，再重新授權
rm token.json   # Windows PowerShell: Remove-Item token.json
classroom-cli auth
```

### 4. `npm link` 失敗或 `classroom-cli` 找不到指令
`npm link` 需寫入全域 node_modules，Windows 上有時需系統管理員權限；若全域 npm bin 不在 PATH，
打 `classroom-cli` 會 command not found。**最簡單的退路是不 link，直接用：**
```bash
node classroom-cli.js list-courses
```
效果完全相同。

### 5. Node.js 版本
`googleapis@^173` 建議在 **Node.js 18 / 20 LTS（含）以上**執行，Node 太舊可能在 `npm install` 階段失敗。

### 6. 找不到 courseId
`list-students`、`post-announcement` 等指令的 `<courseId>` 是**數字 ID**，不是課程名稱。
先跑 `classroom-cli list-courses`，從輸出的 `id` 欄位複製對應課程的 ID。

---

## 🚀 進階功能：讓 AI Agent 下載與讀取學生作業檔案

若要讓 AI Agent 具備「下載與讀取學生所上傳的作業檔案（如 Google 文件、PDF、Word 檔）」之功能，必須額外設定 Google Drive API 權限：

### 1. 啟用 Google Drive API
* 前往 [Google Cloud Console API 庫](https://console.cloud.google.com/apis/library)，搜尋並啟用 **`Google Drive API`**。

### 2. 新增 OAuth Scopes 範圍
* 進入「Google Auth Platform」->「**資料存取權** (Scopes)」。
* 點擊「**新增或移除範圍**」，搜尋並勾選以下權限：
  * `https://www.googleapis.com/auth/drive.readonly` (查看您 Google 雲端硬碟中的檔案)
* 點選「**更新**」，並點擊「**儲存**」。

### 3. 重置本地認證金鑰
* 由於 Scopes 被修改，舊的金鑰將無法使用。請刪除本地的 `token.json`：
  ```bash
  # Windows PowerShell
  Remove-Item token.json
  # macOS / Linux
  rm token.json
  ```
* 重新執行認證指令，並在瀏覽器授權畫面中，勾選新增的「查看您的 Google 雲端硬碟檔案」權限：
  ```bash
  node classroom-cli.js auth
  ```
