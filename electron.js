const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Select folder
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Get images from folder
ipcMain.handle("get-images", async (event, folderPath) => {
  try {
    const files = await fs.readdir(folderPath);
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".tiff",
    ];

    const imagePaths = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map((file) => path.join(folderPath, file));

    return imagePaths;
  } catch (error) {
    console.error("Error reading folder:", error);
    return [];
  }
});

// Save selections to JSON
ipcMain.handle("save-selections", async (event, folderPath, selections) => {
  try {
    const savePath = path.join(folderPath, ".image-manager-selections.json");
    await fs.writeFile(savePath, JSON.stringify(selections, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load selections from JSON
ipcMain.handle("load-selections", async (event, folderPath) => {
  try {
    const savePath = path.join(folderPath, ".image-manager-selections.json");
    const data = await fs.readFile(savePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
});

// Copy files
ipcMain.handle("copy-files", async (event, files) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select destination folder",
  });

  if (result.canceled) return { success: false, message: "Cancelled" };

  const destFolder = result.filePaths[0];
  const results = [];

  for (const file of files) {
    try {
      const fileName = path.basename(file);
      const destPath = path.join(destFolder, fileName);
      await fs.copyFile(file, destPath);
      results.push({ success: true, file });
    } catch (error) {
      results.push({ success: false, file, error: error.message });
    }
  }

  return { success: true, results, destination: destFolder };
});

// Delete files
ipcMain.handle("delete-files", async (event, files) => {
  const results = [];

  for (const file of files) {
    try {
      await fs.unlink(file);
      results.push({ success: true, file });
    } catch (error) {
      results.push({ success: false, file, error: error.message });
    }
  }

  return { success: true, results };
});
