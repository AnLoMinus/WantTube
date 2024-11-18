class YouTubeMP3Converter {
  constructor() {
    this.isDownloading = false;
    this.progressCallback = null;
  }

  // בדיקת תקינות URL של YouTube
  validateYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }

  // קבלת מידע על הסרטון
  async getVideoInfo(url) {
    try {
      const response = await fetch(
        `/api/video-info?url=${encodeURIComponent(url)}`
      );
      if (!response.ok) throw new Error("Failed to fetch video info");
      return await response.json();
    } catch (error) {
      throw new Error("Could not get video information: " + error.message);
    }
  }

  // המרה והורדת MP3
  async convertToMP3(url, onProgress = () => {}) {
    if (!this.validateYouTubeUrl(url)) {
      throw new Error("Invalid YouTube URL");
    }

    if (this.isDownloading) {
      throw new Error("Another download is in progress");
    }

    this.isDownloading = true;
    this.progressCallback = onProgress;

    try {
      // עדכון התקדמות - התחלה
      this.progressCallback({ status: "starting", progress: 0 });

      // קבלת מידע על הסרטון
      const videoInfo = await this.getVideoInfo(url);

      // עדכון התקדמות - מידע התקבל
      this.progressCallback({ status: "fetching", progress: 20 });

      // התחלת תהליך ההמרה
      const convertResponse = await fetch("/api/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, videoInfo }),
      });

      if (!convertResponse.ok) {
        throw new Error("Conversion failed");
      }

      // עדכון התקדמות - המרה
      this.progressCallback({ status: "converting", progress: 60 });

      // קבלת קישור להורדה
      const { downloadUrl } = await convertResponse.json();

      // עדכון התקדמות - הורדה
      this.progressCallback({ status: "downloading", progress: 80 });

      // יצירת הורדה
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = `${videoInfo.title}.mp3`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // עדכון התקדמות - סיום
      this.progressCallback({ status: "completed", progress: 100 });

      return {
        success: true,
        filename: `${videoInfo.title}.mp3`,
        url: downloadUrl,
      };
    } catch (error) {
      this.progressCallback({ status: "error", progress: 0 });
      throw error;
    } finally {
      this.isDownloading = false;
    }
  }

  // ביטול ההורדה הנוכחית
  cancelDownload() {
    if (this.isDownloading) {
      this.isDownloading = false;
      this.progressCallback({ status: "cancelled", progress: 0 });
    }
  }
}

// ייצוא המחלקה לשימוש
export default YouTubeMP3Converter;
