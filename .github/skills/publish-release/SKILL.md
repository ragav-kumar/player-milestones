---
name: publish-release
description: 'Publish a new GitHub release for the `player-milestones` Foundry VTT module. Use when bumping patch/minor/major versions, updating `package.json` and `module.json`, creating the Foundry zip asset, running test/typecheck/lint/build verification, committing and pushing release changes, creating a `vX.Y.Z` tag, and printing the manifest URL.'
argument-hint: '[patch|minor|major] or a short note about the release'
user-invocable: true
---

# Publish Release

Use this skill when releasing a new version of `player-milestones` to GitHub for Foundry VTT use.

## Repo-specific release facts

- Repository: `https://github.com/ragav-kumar/player-milestones`
- Default branch: `main`
- Tag format: `v<version>`
- Current manifest pattern: `https://github.com/ragav-kumar/player-milestones/releases/latest/download/module.json`
- Current versioned download pattern: `https://github.com/ragav-kumar/player-milestones/releases/download/v<version>/player-milestones.zip`
- Foundry consumers need two release artifacts to line up:
  - the manifest URL
  - the matching `player-milestones.zip` asset
- Versioned files that must stay in sync:
  - `package.json`
  - `module.json`

## Decision Rules

1. **Default to a patch bump** for normal fixes and small enhancements.
2. **Ask before using `minor` or `major`** if the change seems large, user-facing, or potentially breaking.
3. **Do not proceed with a release if the working tree contains unexpected changes.** Ask the user to confirm what should be included.
4. **Do not tag or publish** unless fresh verification succeeds:
   - `npm run test`
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
5. **Do not claim the release is complete without evidence** from the actual commands.
6. If the release process depends on unclear or conflicting instructions, **stop and ask** instead of guessing.

## Release Procedure

### 1. Inspect the repo state

Check:
- current branch
- git status
- git remote
- current version in `package.json` and `module.json`

If the branch is not `main`, or the worktree is dirty in an unexpected way, confirm with the user before continuing.

### 2. Choose the version bump

- Use `patch` by default.
- If the changes are substantial, ask whether `minor` is more appropriate.
- If the change is breaking, ask whether `major` is intended.

### 3. Update versioned files together

Bump the version consistently in:
- `package.json.version`
- `module.json.version`
- `module.json.download` to `.../releases/download/v<new-version>/player-milestones.zip`

Keep the manifest URL aligned with the repo’s chosen pattern.

### 4. Verify before tagging

Run and check each command in full:

```powershell
npm run test
npm run typecheck
npm run lint
npm run build
```

If any command fails, stop and fix the issue before continuing. **Do not release, tag, or push a broken build.**

### 5. Create the Foundry zip asset

After verification passes, create the distributable zip that Foundry users will install by running the repo’s packaging command:

```powershell
npm run release:zip
```

This produces:

```text
release/player-milestones.zip
```

The archive contains the module runtime files at the zip root so Foundry can install it directly.

### 6. Prepare the release commit

If release-related files changed and are ready:

```powershell
git add package.json module.json
git commit -m "chore: release v<new-version>"
```

`release/player-milestones.zip` is a release artifact for GitHub, not a committed source file.

If there are already intended uncommitted changes for the release, include them deliberately. Do not auto-commit unrelated edits.

### 7. Push the commit if needed

```powershell
git push origin main
```

Only do this after the verification commands pass.

### 8. Create and push the tag

```powershell
git tag v<new-version>
git push origin v<new-version>
```

Confirm the tag matches the version in `package.json` and `module.json`.

### 9. Create the GitHub release

Preferred path if GitHub CLI is available:

```powershell
gh release create v<new-version> --title "v<new-version>" release/player-milestones.zip module.json
```

Attach the Foundry-facing assets explicitly:
- `release/player-milestones.zip`
- `module.json`

Release notes are not required for this workflow.

If `gh` is unavailable, stop after push/tag and tell the user exactly what remains to do in the GitHub web UI.

### 10. Print the manifest URL

Always print the manifest URL clearly at the end:

```text
https://github.com/ragav-kumar/player-milestones/releases/latest/download/module.json
```

If helpful, the agent may also verify that `module.json.download` points to the correct versioned zip asset, but the required final printed output is the manifest URL.

## Completion Checklist

A release is only complete when all of the following are true:

- `package.json` and `module.json` show the same new version
- `module.json.download` points at the new tag and zip asset
- `npm run test` passes
- `npm run typecheck` passes
- `npm run lint` passes
- `npm run build` passes
- `release/player-milestones.zip` has been created for the new version
- release commit is committed and pushed if needed
- tag `v<new-version>` exists on GitHub
- the GitHub release exists and includes `release/player-milestones.zip` plus `module.json`
- the manifest URL is printed for the user

## Example Prompts

- `/publish-release patch`
- `/publish-release minor`
- `Publish a new release for this package and print the manifest URL.`
- `Cut a patch release for player-milestones, push it, and tag GitHub.`
