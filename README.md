# Download Page Documentation

The Jeebon download page at [download.jeebon.ai](https://download.jeebon.ai) provides a user-friendly interface for downloading different versions of the Jeebon app for Android and iOS platforms.

## Features

- **Dynamic Version Selection**: Dropdown menus for selecting specific versions of the app
- **Automatic Version Listing**: Automatically fetches and displays all available releases from GitHub
- **Latest First**: Displays the newest releases at the top of the dropdown
- **Fallback Options**: Provides direct download links to the latest versions if GitHub API is unavailable
- **Responsive Design**: Works well on both desktop and mobile devices

## How It Works

The download page uses JavaScript to fetch releases from the GitHub API and dynamically populate the dropdown menus with available versions. Here's how it works:

1. When the page loads, it makes a request to the GitHub API to fetch all releases for the repository
2. It processes the response to extract Android and iOS assets from each release
3. It populates the dropdown menus with the available versions, sorted by release date (newest first)
4. When a user selects a version from the dropdown, the download button is updated with the appropriate download link
5. When the user clicks the download button, the selected version is downloaded

## Technical Implementation

The download page consists of the following components:

- **index.html**: The main HTML file that defines the structure of the page
- **releases.js**: JavaScript file that handles fetching releases and updating the UI
- **Bootstrap CSS/JS**: For styling and responsive design

### GitHub API Integration

The page uses the GitHub API to fetch releases:

```javascript
// Fetch releases from GitHub API
async function fetchReleases() {
    try {
        showLoading(true);

        // Add a cache-busting parameter to avoid browser caching
        const timestamp = new Date().getTime();
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases?_=${timestamp}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
        });

        // Process response...
    } catch (error) {
        // Handle errors...
    }
}
```

### Error Handling

The page includes robust error handling to ensure a good user experience even when the GitHub API is unavailable:

1. **API Rate Limiting**: Detects when the GitHub API rate limit is exceeded and provides a helpful message
2. **Fallback Options**: Provides direct download links to the latest versions if the API is unavailable
3. **Loading Indicators**: Shows loading spinners while fetching data

## Deployment

The download page is deployed to Cloudflare Pages using GitHub Actions. The deployment process is automated and triggered whenever changes are made to the files in the `download-page` directory.

### Automatic Deployment

A GitHub Actions workflow automatically deploys the download page when changes are pushed to the main branch:

```yaml
name: Deploy Download Page

on:
  push:
    branches:
      - main
    paths:
      - 'download-page/**'
  workflow_dispatch:  # Allow manual triggering

jobs:
  deploy-download-page:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: List download page files
        run: |
          echo "Files to be deployed:"
          ls -la download-page/

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy ./download-page --project-name=jeebon-download
```

### Manual Deployment

To manually deploy the download page:

```bash
npx wrangler pages deploy ./download-page --project-name=jeebon-download
```

## Updating the Download Page

### Adding New Versions

When new releases are created with the appropriate tags (containing `ios` or `android`), the GitHub Actions workflow will:

1. Build the iOS and/or Android apps
2. Upload the builds as assets to the GitHub release
3. Create a PR to update the download page with links to the new builds

Once the PR is merged, the download page will automatically be updated with the new versions.

### Modifying the Page

To make changes to the download page:

1. Make changes to the files in the `download-page` directory
2. Commit and push your changes to the main branch
3. The GitHub Actions workflow will automatically deploy the updated page to Cloudflare Pages

```bash
# After making changes to the download page files
git add download-page/
git commit -m "Update download page"
git push origin main
```

## Troubleshooting

### GitHub API Rate Limiting

The GitHub API has rate limits that may affect the download page. If you encounter rate limiting issues:

1. The page will display an error message with the time when the rate limit will reset
2. Users can still download the latest versions using the fallback links provided in the error message

### Missing Assets

If a release doesn't have Android or iOS assets, it won't appear in the respective dropdown menu. Make sure that:

1. Release assets are properly named (should include "android" or "ios" in the filename)
2. Release assets are properly uploaded to the GitHub release

## Future Improvements

Potential future improvements for the download page:

1. **Release Notes**: Display release notes for each version
2. **File Size Information**: Show the size of each download
3. **Download Count**: Track and display the number of downloads for each version
4. **QR Code Generation**: Generate QR codes for easy downloading on mobile devices
5. **Direct Installation**: Implement web install capabilities for Android (using the Web Install API)
