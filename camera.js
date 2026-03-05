class Camera {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.facingMode = 'environment';
  }

  async start() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: this.facingMode,
        width: { ideal: 4096 },
        height: { ideal: 3072 }
      },
      audio: false
    });
    this.video.srcObject = this.stream;
    await this.video.play();
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    await this.start();
  }

  capture() {
    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0);
    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });
  }

  getResolution() {
    return { width: this.video.videoWidth, height: this.video.videoHeight };
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
