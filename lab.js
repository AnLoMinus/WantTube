document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const htmlElement = document.documentElement;

  // Check for saved theme preference
  const savedTheme = localStorage.getItem("theme") || "light";
  htmlElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    htmlElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    themeToggleBtn.className = theme === "light" ? "fas fa-moon" : "fas fa-sun";
  }

  // URL Input and Paste Functionality
  const urlInput = document.getElementById("url-input");
  const pasteBtn = document.getElementById("paste-btn");
  const downloadBtn = document.getElementById("download-btn");
  const videoPreview = document.getElementById("video-preview");
  const progressBar = document.querySelector(".progress-fill");
  const statusText = document.getElementById("status");

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text;
      await loadVideoPreview(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  });

  urlInput.addEventListener("input", async (e) => {
    await loadVideoPreview(e.target.value);
  });

  async function loadVideoPreview(url) {
    if (!isValidYouTubeUrl(url)) {
      videoPreview.innerHTML = "";
      return;
    }

    try {
      const videoId = extractVideoId(url);
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=YOUR_API_KEY&part=snippet`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const video = data.items[0].snippet;
        videoPreview.innerHTML = `
                      <img src="${video.thumbnails.medium.url}" alt="${video.title}">
                      <div class="video-info">
                          <h3>${video.title}</h3>
                          <p>${video.channelTitle}</p>
                      </div>
                  `;
        videoPreview.style.display = "block";
      }
    } catch (err) {
      console.error("Failed to load video preview:", err);
    }
  }

  downloadBtn.addEventListener("click", async () => {
    const url = urlInput.value;
    if (!isValidYouTubeUrl(url)) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    try {
      downloadBtn.disabled = true;
      statusText.textContent = "Starting download...";

      const format = document.getElementById("format-select").value;
      const quality = document.getElementById("quality-select").value;
      const trimStart = document.getElementById("trim-start").value;
      const trimEnd = document.getElementById("trim-end").value;

      await downloadAudio(url, {
        format,
        quality,
        trimStart,
        trimEnd,
      });
    } catch (err) {
      console.error("Download failed:", err);
      statusText.textContent = "Download failed. Please try again.";
    } finally {
      downloadBtn.disabled = false;
    }
  });
});

// Utility Functions
function isValidYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return pattern.test(url);
}

function extractVideoId(url) {
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

async function downloadAudio(url, options) {
  // Update progress periodically (simulated for now)
  const updateProgress = (progress) => {
    progressBar.style.width = `${progress}%`;
    statusText.textContent = `Downloading... ${progress}%`;
  };

  // Simulate download progress
  for (let i = 0; i <= 100; i += 10) {
    updateProgress(i);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // In a real implementation, you would:
  // 1. Call your backend API to handle the YouTube download
  // 2. Process the audio according to the selected options
  // 3. Return the processed file to the user

  statusText.textContent = "Download complete!";
  setTimeout(() => {
    progressBar.style.width = "0%";
    statusText.textContent = "Ready to download";
  }, 3000);
}

// Batch Processing Functionality
const batchFileInput = document.getElementById("batch-file");
batchFileInput.addEventListener("change", handleBatchFile);

async function handleBatchFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const urls = text
      .split("\n")
      .filter((url) => isValidYouTubeUrl(url.trim()));

    if (urls.length === 0) {
      alert("No valid YouTube URLs found in the file");
      return;
    }

    // Process the URLs (implement your batch processing logic here)
    console.log(`Found ${urls.length} valid URLs to process`);
  } catch (err) {
    console.error("Failed to process batch file:", err);
    alert("Failed to process the file");
  }
}
