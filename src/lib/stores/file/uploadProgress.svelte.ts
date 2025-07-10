import type { UploadProgress } from "./uploadUtils.js";

interface UploadProgressState {
  isVisible: boolean;
  isMinimized: boolean;
  uploadProgress: UploadProgress | null;
}

const uploadProgressState = $state<UploadProgressState>({
  isVisible: false,
  isMinimized: false,
  uploadProgress: null,
});

export const uploadProgressStore = {
  get isVisible() {
    return uploadProgressState.isVisible;
  },

  get isMinimized() {
    return uploadProgressState.isMinimized;
  },

  get uploadProgress() {
    return uploadProgressState.uploadProgress;
  },

  show(progress: UploadProgress) {
    uploadProgressState.uploadProgress = progress;
    uploadProgressState.isVisible = true;
    uploadProgressState.isMinimized = false;
  },

  update(progress: UploadProgress) {
    uploadProgressState.uploadProgress = progress;

    if (
      progress.overallProgress >= 100 &&
      progress.filesCompleted === progress.totalFiles
    ) {
      setTimeout(() => this.minimize(), 3000);
    }
  },

  minimize() {
    uploadProgressState.isMinimized = true;
  },

  maximize() {
    uploadProgressState.isMinimized = false;
  },

  hide() {
    uploadProgressState.isVisible = false;
    uploadProgressState.isMinimized = false;
    uploadProgressState.uploadProgress = null;
  },
};
