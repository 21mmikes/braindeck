# Complete Setup Guide — for macOS, assuming you have never used a terminal

Everything below is copy-paste. Nothing assumes prior knowledge.

---

## Part 0 · Opening the Terminal

Press **⌘ + Space**, type `Terminal`, press **Enter**. A window opens with a line of text and a
cursor. This is where you paste commands. After pasting each one, press **Enter** and wait until the
cursor comes back before pasting the next.

> **The `$` sign is not part of the command.** Where you see `$ npm install`, you type `npm install`.

---

## Part 1 · What Git and GitHub actually are

| Thing | What it is | Everyday analogy |
| --- | --- | --- |
| **Git** | A program on your computer that records every version of a folder of files | Track Changes in Word, but for a whole project, and it never forgets |
| **A repository ("repo")** | A folder that Git is watching | The document being tracked |
| **A commit** | One saved snapshot, with a message saying what changed | Clicking Save, and writing a note about why |
| **GitHub** | A website that stores repos online | Google Drive, for repos |
| **A remote** | The address of the online copy | The share link |
| **Clone** | Downloading a repo, with its full history | Making your own copy of a shared document |
| **Push** | Uploading your commits to GitHub | Syncing your copy back up |

For your project you need exactly three of these: clone, commit, push.

---

## Part 2 · Installing the tools

### 2.1 Git

Git usually comes with macOS. Check:

```bash
git --version
```

If you see a version number, skip to 2.2. If macOS offers to install "command line developer
tools", click **Install** and wait. If nothing happens, run:

```bash
xcode-select --install
```

### 2.2 Homebrew (the macOS package installer)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It will ask for your Mac password. **The password will not appear as you type it** — that is
normal, not a frozen screen. Type it and press Enter.

At the end, Homebrew prints two or three lines starting with `echo` under a heading called
"Next steps". **Copy and run those lines**, or Homebrew will not be on your path. On Apple Silicon
Macs they look like:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 2.3 Node.js

```bash
brew install node
node --version    # should print v20 or higher
npm --version
```

### 2.4 Tell Git who you are

Do this once, ever. Use the same email as your GitHub account.

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## Part 3 · Cloning Anki and making it your own repository

This part does what the brief asks: clone `ankitects/anki`, cut it loose from its original home, and
attach it to a brand new private repository of your own.

> **⚠️ Read this before you build on it.** Anki is licensed **AGPL-3.0-or-later**. Cloning it to
> read and learn from is completely fine. But if you build a product on top of Anki's code and later
> let other people use it over a network, the AGPL requires you to publish your full source under
> the AGPL too. That is why the BrainDeck app in this folder **reimplements** the SM-2 algorithm
> from its documented behaviour instead of copying Anki's code — algorithms are not copyrightable,
> so your app stays yours. Clone Anki to study it; keep your own app separate.

### 3.1 Choose a home for your code

```bash
mkdir -p ~/Projects
cd ~/Projects
```

`cd` means "change directory". `~` means your home folder.

### 3.2 Clone Anki

```bash
git clone https://github.com/ankitects/anki.git my-anki-study
cd my-anki-study
```

This downloads the whole project and its twenty years of history. It takes a minute or two.

### 3.3 Cut it loose from Anki's GitHub

```bash
git remote -v              # shows it currently points at ankitects/anki
git remote remove origin
git remote -v              # now prints nothing — it is detached
```

`origin` is just the nickname Git gives the default remote. Removing it means your commits have
nowhere to go until you point it somewhere new.

### 3.4 Create your own private repository on GitHub

1. Go to **https://github.com/new**
2. **Repository name:** `my-anki-study`
3. Select **Private**
4. **Do not** tick "Add a README", "Add .gitignore" or "Choose a licence" — you already have files,
   and those options would create a conflict
5. Click **Create repository**

### 3.5 Connect and push

Replace `YOUR-USERNAME` with your actual GitHub username:

```bash
git remote add origin https://github.com/YOUR-USERNAME/my-anki-study.git
git branch -M main
git push -u origin main
```

GitHub will ask you to sign in. **Your GitHub password will not work** — GitHub stopped accepting it
for Git in 2021. You need a Personal Access Token:

1. Go to **https://github.com/settings/tokens**
2. **Generate new token → Generate new token (classic)**
3. Note: `my mac`, Expiration: 90 days, tick the **`repo`** checkbox
4. **Generate token**, then copy it immediately — it is only shown once
5. Paste it when the terminal asks for your **password**

Refresh your GitHub page. The whole codebase is now yours.

---

## Part 4 · Where Anki's spaced repetition maths actually lives

Anki is a multi-language codebase and the scheduling is **not** in the Python you might expect. Open
the repo in a text editor and look here:

| Path | What is in it |
| --- | --- |
| `rslib/src/scheduler/` | The scheduler as a whole — queue building, day cutoffs, deck limits |
| `rslib/src/scheduler/answering/` | **Start here.** What happens when you press Again/Hard/Good/Easy |
| `rslib/src/scheduler/answering/learning.rs` | Learning steps for new cards |
| `rslib/src/scheduler/answering/review.rs` | Interval and ease maths for mature cards |
| `rslib/src/scheduler/queue/` | How each day's queue is gathered, sorted and buried |
| `rslib/src/scheduler/fsrs/` | FSRS — the newer algorithm (memory state, parameter fitting) |
| `proto/anki/scheduler.proto` | The contract between the Rust core and every front end |
| `pylib/` | Thin Python bindings over the Rust core |
| `qt/` | The desktop application interface |
| `ts/` | The Svelte reviewer you actually see while studying |

Since version 23.10 Anki ships **two** algorithms: classic **SM-2**, and **FSRS**, which models
memory as retrievability, stability and difficulty and hits the same retention with fewer reviews.
BrainDeck implements SM-2, because FSRS needs a history of real reviews to optimise against — which
is exactly why the app logs every single review to the `reviews` table.

**The equivalent file in your own app is `src/lib/scheduler.ts`.** It is about 200 lines, heavily
commented, and mirrors the rules in `rslib/src/scheduler/answering/`.

---

## Part 5 · Running BrainDeck on localhost

### 5.1 Get an API key

1. Go to **https://console.anthropic.com**
2. Sign up, then **Settings → Billing** and add about £5 of credit (a whole project costs pennies)
3. **API Keys → Create Key**, copy it — it starts `sk-ant-`

### 5.2 Install and run

```bash
cd ~/Projects/ai-flashcards      # wherever you unzipped this folder
npm install
```

`npm install` downloads the libraries the app needs. It takes 1–3 minutes the first time and prints
a lot of text. Warnings are normal; red `ERR!` lines are not.

Now create your secrets file:

```bash
cp .env.local.example .env.local
open -e .env.local
```

TextEdit opens. Replace `sk-ant-paste-your-key-here` with your real key, save (**⌘S**) and close.

Start the app:

```bash
npm run dev
```

You will see:

```
▲ Next.js 15.5.4
- Local:  http://localhost:3000
✓ Ready in 2.1s
```

### 5.3 Open it

Go to **http://localhost:3000** in Safari or Chrome.

Drag a PDF onto the page. In 20–40 seconds you have a deck. Click **Start studying**.

To stop the server, click the Terminal window and press **Control + C**.

### 5.4 Using it

| Action | How |
| --- | --- |
| Flip the card | Click it, or press **Space** |
| Grade it | Click a button, or press **1** / **2** / **3** / **4** |
| See all your decks | **Library** tab |
| Search inside a deck | **Browse cards** on any deck |
| Start a deck over | **Reset** on any deck |
| See your retention rate | **Progress** tab |

The time printed under each grading button is when that card will come back. That is the spaced
repetition algorithm showing its working.

---

## Part 6 · Putting *your* app on GitHub

Same three commands as before, from inside the `ai-flashcards` folder:

```bash
cd ~/Projects/ai-flashcards
git init
git add .
git commit -m "Initial commit: AI flashcard platform with SM-2 scheduling"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ai-flashcards.git
git push -u origin main
```

> **Check before you push:** run `git status` and make sure `.env.local` is **not** listed. It is
> already in `.gitignore`, so it should not be — but a leaked API key gets used by strangers within
> hours. If you ever push one by accident, revoke it in the Anthropic console immediately.

From then on, saving your work is three commands:

```bash
git add .
git commit -m "Describe what you changed"
git push
```

### A branching setup markers like to see

```bash
git checkout -b develop          # work happens here
git checkout -b feature/export   # one branch per feature
# ... work, commit ...
git checkout develop
git merge feature/export
git checkout main
git merge develop                # only working code reaches main
git push --all
```

---

## Part 7 · When something goes wrong

| What you see | What it means | Fix |
| --- | --- | --- |
| `command not found: npm` | Node did not install, or Homebrew is not on your path | Re-run the `echo`/`eval` lines from Homebrew's "Next steps", close and reopen Terminal |
| `No Anthropic API key found` | `.env.local` is missing, or still has the placeholder | Check the file, then **stop the server (Control+C) and run `npm run dev` again** — env files are only read at startup |
| `EADDRINUSE: port 3000` | Something else is already on that port | `npm run dev -- -p 3001`, then use localhost:3001 |
| `Almost no text could be read` | The PDF is a scan — a photo of a page with no text layer | Open it in Preview and export as PDF, or use a text-based version |
| Cards look shallow or generic | The document was mostly headings and bullet fragments | Try a denser source; or raise `CARDS_PER_DOCUMENT` in `.env.local` |
| `better-sqlite3` build errors | The native module needs Xcode tools | `xcode-select --install`, then `rm -rf node_modules && npm install` |
| Everything is broken and you want to start over | | `rm -rf node_modules .next && npm install` |
| You want to wipe your study history | | `rm -rf data/` — this deletes all decks permanently |

---

## Part 8 · Building the project report

```bash
pip3 install python-docx
python3 docs/generate_project_report.py
```

`BrainDeck_Project_Report.docx` appears in `docs/`. Open it in Word, or drag it into Google Drive
and choose **Open with → Google Docs**.

---

## Where each file lives

| You want to change... | Edit this |
| --- | --- |
| Colours, fonts, the whole look | `src/app/globals.css` (the `:root` block at the top) |
| How the AI writes cards | `SYSTEM_PROMPT` in `src/lib/ai.ts` |
| How aggressively you are scheduled | `CONFIG` in `src/lib/scheduler.ts` |
| What the upload page says | `src/app/page.tsx` |
| The study screen | `src/app/study/[id]/page.tsx` |
| The database tables | `src/lib/db.ts` |
