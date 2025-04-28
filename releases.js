// GitHub repository information
const REPO_OWNER = 'wizardsupreme';
const REPO_NAME = 'djibon-frontend';

// DOM elements
let androidDropdown;
let iosDropdown;
let androidDownloadBtn;
let iosDownloadBtn;
let loadingIndicator;
let releaseShaInfo;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    androidDropdown = document.getElementById('android-versions');
    iosDropdown = document.getElementById('ios-versions');
    androidDownloadBtn = document.getElementById('android-download-btn');
    iosDownloadBtn = document.getElementById('ios-download-btn');
    loadingIndicator = document.getElementById('loading-indicator');
    releaseShaInfo = document.getElementById('release-sha-info');

    // Fetch releases from GitHub
    fetchReleases();

    // Fetch download site information
    fetchDownloadSiteInfo();

    // Add event listeners for dropdown changes
    androidDropdown.addEventListener('change', updateAndroidDownloadLink);
    iosDropdown.addEventListener('change', updateIOSDownloadLink);
});

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

        if (!response.ok) {
            // Check for rate limiting
            if (response.status === 403) {
                const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                if (rateLimitRemaining === '0') {
                    const resetTime = response.headers.get('X-RateLimit-Reset');
                    const resetDate = new Date(resetTime * 1000);
                    throw new Error(`GitHub API rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}.`);
                }
            }
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const releases = await response.json();

        // Check if we have any releases
        if (!releases || releases.length === 0) {
            throw new Error('No releases found for this repository');
        }

        // Process releases to extract Android and iOS assets
        const androidReleases = [];
        const iosReleases = [];

        // Get the latest release for SHA information
        const latestRelease = releases[0];
        const releaseSha = latestRelease.target_commitish || 'Unknown';
        const releaseDate = new Date(latestRelease.published_at || latestRelease.created_at);

        // Update the release SHA info at the bottom of the page
        if (releaseShaInfo) {
            releaseShaInfo.textContent = `Released (${formatDate(releaseDate)}): ${releaseSha}`;
            releaseShaInfo.classList.remove('d-none'); // Make visible now that we have data
        }

        for (const release of releases) {
            // Skip releases without assets
            if (!release.assets || release.assets.length === 0) continue;

            // Extract version from release name or tag
            let version = release.name || release.tag_name || 'Unknown';
            if (version.startsWith('Release ')) {
                version = version.substring(8);
            } else if (version.startsWith('v')) {
                version = version.substring(1);
            }

            // Check for Android assets
            const androidAsset = release.assets.find(asset =>
                asset.name.toLowerCase().includes('android') ||
                asset.name.toLowerCase().endsWith('.apk')
            );

            if (androidAsset) {
                androidReleases.push({
                    version,
                    downloadUrl: androidAsset.browser_download_url,
                    releaseDate: new Date(release.published_at || release.created_at),
                    assetName: androidAsset.name
                });
            }

            // Check for iOS assets
            const iosAsset = release.assets.find(asset =>
                asset.name.toLowerCase().includes('ios') &&
                (asset.name.toLowerCase().endsWith('.zip') || asset.name.toLowerCase().endsWith('.ipa'))
            );

            if (iosAsset) {
                iosReleases.push({
                    version,
                    downloadUrl: iosAsset.browser_download_url,
                    releaseDate: new Date(release.published_at || release.created_at),
                    assetName: iosAsset.name
                });
            }
        }

        // Sort releases by date (newest first)
        androidReleases.sort((a, b) => b.releaseDate - a.releaseDate);
        iosReleases.sort((a, b) => b.releaseDate - a.releaseDate);

        // Populate dropdowns
        populateDropdown(androidDropdown, androidReleases);
        populateDropdown(iosDropdown, iosReleases);

        // Update download buttons with latest release URLs
        if (androidReleases.length > 0) {
            androidDownloadBtn.href = androidReleases[0].downloadUrl;
            androidDownloadBtn.setAttribute('data-version', androidReleases[0].version);
            androidDownloadBtn.classList.remove('disabled');
            document.getElementById('android-version-display').textContent = androidReleases[0].version;
        } else {
            androidDownloadBtn.classList.add('disabled');
            document.getElementById('android-version-display').textContent = 'No releases available';
        }

        if (iosReleases.length > 0) {
            iosDownloadBtn.href = iosReleases[0].downloadUrl;
            iosDownloadBtn.setAttribute('data-version', iosReleases[0].version);
            iosDownloadBtn.classList.remove('disabled');
            document.getElementById('ios-version-display').textContent = iosReleases[0].version;
        } else {
            iosDownloadBtn.classList.add('disabled');
            document.getElementById('ios-version-display').textContent = 'No releases available';
        }

        showLoading(false);
    } catch (error) {
        console.error('Error fetching releases:', error);
        showError(error.message);
        showLoading(false);

        // Don't show release SHA info in case of error
        // The element will remain hidden
    }
}

// Populate dropdown with release options
function populateDropdown(dropdown, releases) {
    // Clear existing options
    dropdown.innerHTML = '';

    if (releases.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No releases available';
        dropdown.appendChild(option);
        return;
    }

    // Add options for each release
    releases.forEach((release, index) => {
        const option = document.createElement('option');
        option.value = release.downloadUrl;
        option.textContent = `${release.version} (${formatDate(release.releaseDate)})`;
        option.setAttribute('data-version', release.version);
        option.setAttribute('data-asset-name', release.assetName);

        // Select the first (latest) release by default
        if (index === 0) {
            option.selected = true;
        }

        dropdown.appendChild(option);
    });
}

// Update Android download button when dropdown selection changes
function updateAndroidDownloadLink() {
    const selectedOption = androidDropdown.options[androidDropdown.selectedIndex];
    const downloadUrl = selectedOption.value;
    const version = selectedOption.getAttribute('data-version');

    // Extract release date from the option text
    const optionText = selectedOption.textContent;
    const dateMatch = optionText.match(/\((.*?)\)/);
    const dateStr = dateMatch ? dateMatch[1] : '';

    if (downloadUrl) {
        androidDownloadBtn.href = downloadUrl;
        androidDownloadBtn.setAttribute('data-version', version);
        androidDownloadBtn.classList.remove('disabled');
        document.getElementById('android-version-display').textContent = version;

        // Update release info if this is the latest Android version
        if (androidDropdown.selectedIndex === 0) {
            // Extract SHA from URL if possible
            const shaMatch = downloadUrl.match(/[a-f0-9]{7,40}/i);
            const sha = shaMatch ? shaMatch[0] : 'Unknown';
            if (releaseShaInfo) {
                releaseShaInfo.textContent = `Released (${dateStr}): ${sha}`;
            }
        }
    } else {
        androidDownloadBtn.removeAttribute('href');
        androidDownloadBtn.classList.add('disabled');
        document.getElementById('android-version-display').textContent = 'No releases available';
    }
}

// Update iOS download button when dropdown selection changes
function updateIOSDownloadLink() {
    const selectedOption = iosDropdown.options[iosDropdown.selectedIndex];
    const downloadUrl = selectedOption.value;
    const version = selectedOption.getAttribute('data-version');

    // Extract release date from the option text
    const optionText = selectedOption.textContent;
    const dateMatch = optionText.match(/\((.*?)\)/);
    const dateStr = dateMatch ? dateMatch[1] : '';

    if (downloadUrl) {
        iosDownloadBtn.href = downloadUrl;
        iosDownloadBtn.setAttribute('data-version', version);
        iosDownloadBtn.classList.remove('disabled');
        document.getElementById('ios-version-display').textContent = version;

        // Update release info if this is the latest iOS version
        if (iosDropdown.selectedIndex === 0) {
            // Extract SHA from URL if possible
            const shaMatch = downloadUrl.match(/[a-f0-9]{7,40}/i);
            const sha = shaMatch ? shaMatch[0] : 'Unknown';
            if (releaseShaInfo) {
                releaseShaInfo.textContent = `Released (${dateStr}): ${sha}`;
            }
        }
    } else {
        iosDownloadBtn.removeAttribute('href');
        iosDownloadBtn.classList.add('disabled');
        document.getElementById('ios-version-display').textContent = 'No releases available';
    }
}

// Format date to a readable string
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show or hide loading indicator
function showLoading(isLoading) {
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }

    // Disable dropdowns while loading
    if (androidDropdown) androidDropdown.disabled = isLoading;
    if (iosDropdown) iosDropdown.disabled = isLoading;
}



// Fetch download site information from site-info.json
async function fetchDownloadSiteInfo() {
    try {
        // Add a cache-busting parameter to avoid browser caching
        const timestamp = new Date().getTime();
        const response = await fetch(`site-info.json?_=${timestamp}`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Error fetching site info: ${response.status}`);
            return;
        }

        const siteInfo = await response.json();

        // Create or update the download site info element
        const downloadInfoElement = document.getElementById('download-site-info');
        if (downloadInfoElement) {
            downloadInfoElement.textContent = `Download Site | Updated: ${siteInfo.date} | SHA: ${siteInfo.sha}`;
            downloadInfoElement.classList.remove('d-none'); // Make visible now that we have data
        }
    } catch (error) {
        console.error('Error fetching download site info:', error);
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = `Error: ${message}`;
        errorElement.style.display = 'block';

        // Add a fallback message with direct links
        errorElement.innerHTML += `<div class="mt-2">You can also download the latest versions directly:</div>
        <div class="mt-2">
            <a href="djibon-app.apk" class="btn btn-sm btn-primary me-2" download>Download Android APK</a>
            <a href="djibon-ios.zip" class="btn btn-sm btn-success" download>Download iOS Bundle</a>
        </div>`;
    }

    // Hide loading indicator
    showLoading(false);
}
