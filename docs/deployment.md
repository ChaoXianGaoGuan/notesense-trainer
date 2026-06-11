# Deployment

NoteSense is deployed to GitHub Pages with GitHub Actions.

## Public URL

```text
https://chaoxiangaoguan.github.io/notesense-trainer/
```

## Workflow

The deployment workflow is:

```text
.github/workflows/deploy-pages.yml
```

It runs on pushes to `main` and can also be run manually from the GitHub Actions page.

The workflow:

1. Checks out the repository.
2. Sets up Node.
3. Runs `npm ci`.
4. Runs `npm test`.
5. Runs `npm run build`.
6. Uploads `dist/` as a Pages artifact.
7. Deploys the artifact to GitHub Pages.

## Required GitHub Setting

In the GitHub repository:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

If Pages is configured to deploy from a branch, this workflow will not control the published site.

## Common Issues

### Vite Base Path

Project Pages sites are served from `/repository-name/`, not `/`.

The config uses `GITHUB_REPOSITORY` in GitHub Actions to set:

```text
/notesense-trainer/
```

Local development still uses `/`.

### Sample Asset Paths

Audio files must not use hard-coded root paths like `/samples/...`.

The audio engine uses `import.meta.env.BASE_URL` so samples load correctly from GitHub Pages subpaths.

### npm ci Fails

`npm ci` requires `package.json` and `package-lock.json` to be synchronized.

Fix locally with:

```bash
npm install
npm ci
```

Then commit the updated `package-lock.json`.

### Node Action Warnings

Use current GitHub action major versions that support Node 24:

```yaml
actions/checkout@v6
actions/setup-node@v6
actions/configure-pages@v6
actions/upload-pages-artifact@v5
actions/deploy-pages@v5
```

## Updating The Site

After editing code:

```bash
npm test
npm run build
git add .
git commit -m "Describe the change"
git push
```

Pushing to `main` triggers a new Pages deployment.
