<<<<<<< HEAD
## How to Start Laxman Coding AI (Windows)

### Project Location

```powershell
C:\Users\garla\Desktop\LaxmanCodingAI_Phase1\LaxmanCodingAI
```

### Step 1: Open PowerShell

Navigate to the project directory:

```powershell
cd "C:\Users\garla\Desktop\LaxmanCodingAI_Phase1\LaxmanCodingAI"
```

### Step 2: Check Ollama and Installed Models

```powershell
ollama list
```

Verify that `qwen2.5-coder:1.5b` or `qwen2.5-coder:3b` appears in the list.

### Step 3: Start Ollama if It Is Not Already Running

```powershell
ollama serve
```

Keep this terminal open if you started Ollama manually.

**Important:** If you see `Only one usage of each socket address ... is normally permitted`, Ollama is probably already running. Do not start another instance; continue to Step 4.

### Step 4: Start the Desktop Application

Open a second PowerShell terminal and run:

```powershell
cd "C:\Users\garla\Desktop\LaxmanCodingAI_Phase1\LaxmanCodingAI"
npm run electron:dev
```

Wait for the Vite development server and Electron desktop window to start.

### Step 5: Test the Application

Open Laxman Coding AI and send a simple message, such as:

```text
Write a JavaScript function to add two numbers.
```

Confirm that the local AI model responds.

### Troubleshooting

**If dependencies are missing:**

```powershell
npm install
npm run electron:dev
```

**If the desktop application does not start:**

```powershell
npm run
```

Check whether `electron:dev` appears in the available scripts.

**If Ollama is not responding:**

```powershell
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

If this command fails, check whether Ollama is running before trying `ollama serve` again.

**Important reminders**
- Run commands in PowerShell, not inside the Ollama `>>>` prompt.
- Keep Ollama running while using the desktop application.
- Use `Ctrl + C` in the relevant terminal to stop a development process when finished.
- `npm run electron:dev` is for development, not the packaged production application.
=======
# Laxman_Coding_AI
>>>>>>> origin/main
