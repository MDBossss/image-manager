const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  getImages: (folderPath) => ipcRenderer.invoke("get-images", folderPath),
  saveSelections: (folderPath, selections) =>
    ipcRenderer.invoke("save-selections", folderPath, selections),
  loadSelections: (folderPath) =>
    ipcRenderer.invoke("load-selections", folderPath),
  copyFiles: (files) => ipcRenderer.invoke("copy-files", files),
  deleteFiles: (files) => ipcRenderer.invoke("delete-files", files),
});
