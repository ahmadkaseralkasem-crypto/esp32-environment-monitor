# GitHub Repository Setup and Clone Guide

This guide explains how the `esp32-environment-monitor` repository was created on GitHub and cloned onto a Windows computer. Each step includes the reason it is needed.

## Goal

At the end of this guide, there will be two connected copies of the project:

- **Remote repository:** the copy stored on GitHub.
- **Local repository:** the copy stored on the computer, where code can be edited and tested.

Repository used in this guide:

`https://github.com/ahmadkaseralkasem-crypto/esp32-environment-monitor`

## 1. Create or sign in to a GitHub account

Go to [GitHub](https://github.com/) and sign in.

**Why:** GitHub identifies the owner of the repository and controls who can view or change it.

## 2. Create the GitHub repository

1. In GitHub, select the **+** menu in the upper-right corner.
2. Select **New repository**.
3. Enter the repository name: `esp32-environment-monitor`.
4. Add a short description, for example: `Embedded environmental monitoring system developed with ESP32 and FreeRTOS.`
5. Choose **Public** or **Private**.
6. Optionally initialize the repository with:
   - `README.md`
   - A `.gitignore` suitable for C/C++
   - An MIT license
7. Select **Create repository**.

**Why:** The repository is the central online location for the project's files and complete revision history. Public repositories can be viewed by anyone; private repositories are limited to authorized users.

Official reference: [Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)

## 3. Install Git on the computer

Open PowerShell and check whether Git is installed:

```powershell
git --version
```

Example result:

```text
git version 2.55.0.windows.4
```

If Windows says that `git` is not recognized, install [Git for Windows](https://git-scm.com/download/win), then reopen PowerShell.

**Why:** Git is the program that downloads the repository, records changes, creates commits, and synchronizes work with GitHub.

## 4. Copy the repository's HTTPS address

1. Open the repository page on GitHub.
2. Select the green **Code** button.
3. Select **HTTPS**.
4. Copy this address:

```text
https://github.com/ahmadkaseralkasem-crypto/esp32-environment-monitor.git
```

**Why:** The address tells Git exactly which remote repository to download. HTTPS is convenient on Windows and works without configuring SSH keys.

## 5. Choose the local parent folder

Open PowerShell and move to the folder that should contain the project:

```powershell
cd "C:\Users\aal40\Documents\Codex\2026-08-16\i"
```

Confirm the current folder:

```powershell
Get-Location
```

**Why:** `git clone` creates a new project folder inside the current folder. Checking the location prevents the project from being created somewhere unintended.

## 6. Clone the repository

Run:

```powershell
git clone https://github.com/ahmadkaseralkasem-crypto/esp32-environment-monitor.git
```

Git creates this folder automatically:

```text
C:\Users\aal40\Documents\Codex\2026-08-16\i\esp32-environment-monitor
```

**Why:** Cloning downloads the project files and Git history. It also automatically creates a remote connection named `origin`, pointing back to the GitHub repository.

Official reference: [Cloning a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)

## 7. Windows TLS workaround used on this computer

On this computer, the normal clone initially produced this error:

```text
schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS
```

The clone succeeded by using Git's OpenSSL backend for the command:

```powershell
git -c http.sslBackend=openssl clone https://github.com/ahmadkaseralkasem-crypto/esp32-environment-monitor.git
```

The following setting was then saved only inside this repository:

```powershell
cd "C:\Users\aal40\Documents\Codex\2026-08-16\i\esp32-environment-monitor"
git config --local http.sslBackend openssl
```

**Why:** Windows Git's default TLS backend could not obtain the required Windows security credentials. OpenSSL provided an alternative secure HTTPS backend. Using `--local` limits the change to this project instead of changing Git behavior for every repository on the computer.

## 8. Enter the cloned project folder

```powershell
cd "C:\Users\aal40\Documents\Codex\2026-08-16\i\esp32-environment-monitor"
```

**Why:** Git commands should now run inside the cloned repository so they operate on this project.

## 9. Verify the clone

Check the branch and working-tree status:

```powershell
git status
```

The result should show that the current branch is `main` and is up to date with `origin/main`.

Check the GitHub connection:

```powershell
git remote -v
```

Expected remote:

```text
origin  https://github.com/ahmadkaseralkasem-crypto/esp32-environment-monitor.git (fetch)
origin  https://github.com/ahmadkaseralkasem-crypto/esp32-environment-monitor.git (push)
```

Check the latest downloaded commit:

```powershell
git log -1 --oneline
```

**Why:** These checks prove that the repository downloaded correctly, the `main` branch is active, and the local project remains connected to the correct GitHub repository.

## 10. Open the project in Visual Studio Code

From inside the repository, run:

```powershell
code .
```

**Why:** The period means “open the current folder.” Visual Studio Code will treat the entire cloned repository as one project.

## Clone complete

The repository is now successfully cloned. At this point:

- GitHub contains the remote copy.
- The computer contains the local working copy.
- The current local branch is `main`.
- `origin` points to the correct GitHub repository.
- The local repository currently contains `.gitignore`, `LICENSE`, and `README.md`.

The next development step is to install ESP-IDF, create the ESP32 project structure, compile a basic program, and flash it to the board.

## 11. Upload this document to GitHub

First, use PowerShell to enter the cloned repository, create a documentation folder, and copy this guide into it:

```powershell
cd "C:\Users\aal40\Documents\Codex\2026-08-16\i\esp32-environment-monitor"

New-Item -ItemType Directory -Path "docs" -Force

Copy-Item "C:\Users\aal40\Documents\Codex\2026-08-16\i\outputs\GitHub_Clone_Guide.md" "docs\GitHub_Clone_Guide.md"
```

**Why:** The guide is currently stored outside the cloned repository. Git can only track and upload files located inside the repository. These commands create a `docs` folder and place a copy of the guide inside it.

Next, check, record, and upload the document:

```powershell
git status
git add docs/GitHub_Clone_Guide.md
git commit -m "Add GitHub setup and clone guide"
git push origin main
```

What these commands do:

- `git status` checks which files have changed or been added.
- `git add docs/GitHub_Clone_Guide.md` prepares the document for the next commit.
- `git commit -m "Add GitHub setup and clone guide"` records the change in the local repository with a descriptive message.
- `git push origin main` uploads the new commit from the local `main` branch to the GitHub repository named `origin`.

GitHub might open a browser and ask you to sign in. Complete the sign-in process if prompted. After the push finishes, refresh the repository page on GitHub and open the new `docs` folder to confirm that `GitHub_Clone_Guide.md` is present.

## Basic workflow after cloning

After creating or editing files, the usual Git workflow is:

```powershell
git status
git add .
git commit -m "Describe the change"
git push origin main
```

- `git status` shows changed files.
- `git add .` selects the changes for the next commit.
- `git commit` records a local snapshot with a description.
- `git push` uploads the new commits to GitHub.

Do not commit passwords, API tokens, Wi-Fi passwords, private keys, or other secrets.
