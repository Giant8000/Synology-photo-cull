import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.resolve(__dirname, "photos");
const THUMBS_DIR = path.resolve(__dirname, "thumbs");
const DB_PATH = path.resolve(__dirname, "photos.db");

// Ensure directories exist
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR);
}
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR);
}

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS photo_status (
    filename TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending', -- 'pending', 'keep', 'trash'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/photos", (req, res) => {
    try {
      const files = fs.readdirSync(PHOTOS_DIR).filter(file => {
        const fullPath = path.join(PHOTOS_DIR, file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) return false;
          if (stats.size === 0) return false;
          return /\.(jpg|jpeg|png|gif|webp|heic|heif|tiff)$/i.test(file);
        } catch (e) {
          return false;
        }
      });

      const statuses = db.prepare("SELECT * FROM photo_status").all() as any[];
      const statusMap = new Map(statuses.map(s => [s.filename, s.status]));

      const photos = files.map(file => ({
        filename: file,
        status: statusMap.get(file) || "pending",
        url: `/api/photos/view/${file}`,
        thumbUrl: `/api/photos/thumb/${file}`
      }));

      res.json(photos);
    } catch (error) {
      console.error("Error listing photos:", error);
      res.status(500).json({ error: "Failed to list photos" });
    }
  });

  app.post("/api/photos/status", (req, res) => {
    const { filename, status } = req.body;
    if (!filename || !status) {
      return res.status(400).json({ error: "Missing filename or status" });
    }

    try {
      db.prepare(`
        INSERT INTO photo_status (filename, status, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(filename) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
      `).run(filename, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.post("/api/photos/apply", (req, res) => {
    try {
      const trashed = db.prepare("SELECT filename FROM photo_status WHERE status = 'trash'").all() as any[];
      const trashDir = path.join(PHOTOS_DIR, ".trash");
      
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir);
      }

      let count = 0;
      for (const { filename } of trashed) {
        const oldPath = path.join(PHOTOS_DIR, filename);
        const newPath = path.join(trashDir, filename);
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          db.prepare("DELETE FROM photo_status WHERE filename = ?").run(filename);
          count++;
        }
      }

      res.json({ success: true, count });
    } catch (error) {
      console.error("Error applying changes:", error);
      res.status(500).json({ error: "Failed to apply changes" });
    }
  });

  app.get("/api/photos/view/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(PHOTOS_DIR, filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("Not found");
    }
  });

  app.get("/api/photos/thumb/:filename", async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(PHOTOS_DIR, filename);
    const thumbPath = path.join(THUMBS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Not found");
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return res.status(400).send("Empty file");
      }

      if (fs.existsSync(thumbPath)) {
        return res.sendFile(thumbPath);
      }

      await sharp(filePath)
        .resize(300, 300, { fit: "cover" })
        .toFile(thumbPath);
      res.sendFile(thumbPath);
    } catch (error: any) {
      console.error(`Error generating thumbnail for ${filename}:`, error.message);
      // Fallback to original file if sharp fails
      // Browser might still be able to render it if it's a format sharp doesn't support but browser does
      res.sendFile(filePath);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
