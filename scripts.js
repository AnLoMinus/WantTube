document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("url-input");
  const downloadBtn = document.getElementById("download-btn");
  const status = document.getElementById("status");
  const pasteBtn = document.getElementById("paste-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const progressFill = document.querySelector(".progress-fill");
  const videoPreview = document.getElementById("video-preview");

  // Theme Toggle
  let isDarkMode = localStorage.getItem("theme") === "dark";
  updateTheme();

  themeToggleBtn.addEventListener("click", () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    updateTheme();
  });

  function updateTheme() {
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    themeToggleBtn.className = isDarkMode ? "fas fa-sun" : "fas fa-moon";
  }

  // Paste Button
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text;
      validateAndPreviewVideo(text);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  });

  // URL Input Validation and Preview
  urlInput.addEventListener("input", (e) => {
    validateAndPreviewVideo(e.target.value);
  });

  async function validateAndPreviewVideo(url) {
    if (isValidYouTubeUrl(url)) {
      try {
        // Get video ID
        const videoId = extractVideoId(url);
        // Show preview
        videoPreview.style.display = "block";
        videoPreview.innerHTML = `
                    <img src="https://img.youtube.com/vi/${videoId}/maxresdefault.jpg" 
                         alt="Video thumbnail" 
                         style="width: 100%; border-radius: 10px;">
                `;
        downloadBtn.disabled = false;
      } catch (err) {
        console.error("Preview error:", err);
      }
    } else {
      videoPreview.style.display = "none";
      downloadBtn.disabled = true;
    }
  }

  function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  }

  function extractVideoId(url) {
    const regExp =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  // Download Process
  downloadBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();

    if (!url) {
      status.textContent = "Please enter a valid YouTube URL";
      return;
    }

    try {
      status.textContent = "Initializing download...";
      progressFill.style.width = "0%";
      downloadBtn.disabled = true;

      // Get video info
      const videoId = extractVideoId(url);
      const videoInfo = await getVideoInfo(videoId);

      // Update status
      status.textContent = "Converting to MP3...";
      progressFill.style.width = "30%";

      // Get audio stream
      const audioStream = await getAudioStream(videoId);
      progressFill.style.width = "60%";

      // Convert to MP3
      const mp3Blob = await convertToMp3(audioStream);
      progressFill.style.width = "90%";

      // Create download link
      const downloadUrl = URL.createObjectURL(mp3Blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${videoInfo.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      // Reset UI
      status.textContent = "Download Complete!";
      progressFill.style.width = "100%";
      urlInput.value = "";
      videoPreview.style.display = "none";
      downloadBtn.disabled = false;
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
      progressFill.style.width = "0%";
      downloadBtn.disabled = false;
    }
  });

  // Helper functions for YouTube download
  async function getVideoInfo(videoId) {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`
    );
    return response.json();
  }

  async function getAudioStream(videoId) {
    const ytDownload = new YtDownload();
    const formats = await ytDownload.getInfo(
      `https://www.youtube.com/watch?v=${videoId}`
    );
    const audioFormat = formats.formats.find((f) =>
      f.mimeType.includes("audio/mp4")
    );

    const response = await fetch(audioFormat.url);
    return response.blob();
  }

  async function convertToMp3(audioBlob) {
    return new Promise((resolve, reject) => {
      const ffmpeg = FFmpeg.createWorker();

      async function transcode() {
        await ffmpeg.load();
        await ffmpeg.write("audio.mp4", audioBlob);
        await ffmpeg.run("-i audio.mp4 -vn -ab 128k -ar 44100 -y audio.mp3");
        const data = await ffmpeg.read("audio.mp3");
        await ffmpeg.terminate();
        resolve(new Blob([data.buffer], { type: "audio/mp3" }));
      }

      transcode().catch(reject);
    });
  }

  // Add custom error handling for network issues
  window.addEventListener("offline", () => {
    status.textContent = "No internet connection!";
    downloadBtn.disabled = true;
  });

  window.addEventListener("online", () => {
    status.textContent = "Ready to download";
    downloadBtn.disabled = false;
  });

  // Add file size check
  function checkFileSize(blob) {
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (blob.size > MAX_SIZE) {
      throw new Error("File size too large. Please try a shorter video.");
    }
  }

  // Add download progress tracking
  async function downloadWithProgress(url, onProgress) {
    const response = await fetch(url);
    const reader = response.body.getReader();
    const contentLength = +response.headers.get("Content-Length");

    let receivedLength = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedLength += value.length;
      onProgress(receivedLength / contentLength);
    }

    const blob = new Blob(chunks);
    return blob;
  }

  // Add loading animation to download button
  downloadBtn.addEventListener("click", function () {
    this.classList.add("loading");
    setTimeout(() => this.classList.remove("loading"), 2000);
  });
});
