# GitHub Guide for Weather Cloud Monitor

This guide explains how to work with the `weather-cloud-monitor` project using
Git, GitHub, PowerShell, and Visual Studio Code.

## Local project folder

```text
C:\Users\aal40\Documents\Codex\2026-08-16\i\weather-cloud-monitor
```

Open it in PowerShell:

```powershell
cd "C:\Users\aal40\Documents\Codex\2026-08-16\i\weather-cloud-monitor"
```

Open it in Visual Studio Code:

```powershell
code .
```

The period means “open the current folder.”

## Rename the GitHub repository

The local application has been renamed. To give the remote GitHub repository
the same name:

1. Open the repository on GitHub.
2. Select **Settings**.
3. In **General**, change **Repository name** to `weather-cloud-monitor`.
4. Select **Rename**.

After GitHub finishes the rename, update the local remote address:

```powershell
git remote set-url origin https://github.com/ahmadkaseralkasem-crypto/weather-cloud-monitor.git
git remote -v
```

Why: the local folder name and the GitHub repository name are independent. The
`git remote set-url` command connects the local repository to the new address.

## Normal Git workflow

After creating or changing files:

```powershell
git status
git add .
git commit -m "Convert project to Python weather cloud monitor"
git push origin main
```

- `git status` displays changes.
- `git add .` selects the changes.
- `git commit` records a local snapshot.
- `git push` uploads the commit to GitHub.

## Important security rule

Never commit `.env`, Supabase secret keys, passwords, tokens, or private keys.
The project includes `.env.example` only as a safe template. The real `.env`
file is excluded by `.gitignore`.

## Windows Git troubleshooting used on this computer

If Git reports a TLS `SEC_E_NO_CREDENTIALS` error, use the repository-local
OpenSSL backend:

```powershell
git config --local http.sslBackend openssl
```

If Git reports `detected dubious ownership` and this exact project folder is
trusted, register only this folder:

```powershell
git config --global --add safe.directory "C:/Users/aal40/Documents/Codex/2026-08-16/i/weather-cloud-monitor"
```

Do not use `safe.directory "*"`, because it trusts every repository.

If GitHub uses the wrong account, inspect Git Credential Manager:

```powershell
git credential-manager github list
git credential-manager github logout asd-as
git credential-manager github login --username ahmadkaseralkasem-crypto --browser --force
```

Then retry:

```powershell
git push origin main
```

