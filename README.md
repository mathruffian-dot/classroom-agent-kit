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
