# 📸 SynoPhoto Cull

A high-performance, web-based photo culling tool designed to run directly on your Synology NAS. Review, keep, or trash your photos with lightning speed from any desktop or mobile browser.

## 🚀 Features

- **Fast Previews**: Backend thumbnail generation using `sharp` for instant grid loading.
- **Keyboard Optimized**: Cull hundreds of photos in minutes using `K` (Keep), `T` (Trash), and arrow keys.
- **Mobile Ready**: Fully responsive touch interface for culling from your phone or tablet.
- **Safe Workflow**: Trashed photos are moved to a `.trash` subfolder, never deleted immediately.
- **NAS Native**: Built to run as a lightweight service on Synology hardware.

---

## 🛠 Local Setup & Development

To run this application on your local machine for testing or development:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Prepare Photos**:
   Create a folder named `photos` in the project root and add some images (`.jpg`, `.png`, `.webp`, etc.).
   ```bash
   mkdir photos
   ```

3. **Start the Server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

---

## 📁 Connecting to your Synology NAS

To use this with your actual photo library on a Synology NAS, you have two primary options:

### Option A: Docker (Recommended - Synology Container Manager)

If you have a Synology NAS that supports Docker (now called **Container Manager**), this is the easiest way to deploy:

1. **Build the Image**:
   Since Synology doesn't build images directly from source easily, you should build it on your computer first and push it to a registry (like Docker Hub) or export it as a `.tar` file.
   ```bash
   # On your computer
   docker build -t synophoto-cull .
   docker save synophoto-cull > synophoto-cull.tar
   ```

2. **Upload to NAS**:
   Upload the `synophoto-cull.tar` file to a folder on your NAS using File Station.

3. **Import Image**:
   - Open **Container Manager** on your Synology.
   - Go to **Image** > **Import** > **Add from file**.
   - Select the `.tar` file you uploaded.

4. **Create Container**:
   - Select the imported image and click **Run**.
   - **Container Name**: `synophoto-cull`
   - **Port Settings**: Map Local Port `3000` to Container Port `3000`.
   - **Volume Settings**:
     - Click **Add Folder**.
     - Select your NAS photo folder (e.g., `/photo/2024`).
     - **Mount Path**: `/app/photos` (This is critical).
     - (Optional) Map another folder to `/app/thumbs` to persist thumbnails across restarts.
   - **Environment**: Set `NODE_ENV` to `production`.

5. **Done!**: Your app is now running at `http://<NAS-IP>:3000`.

### Option B: Manual Setup (via SSH/Task Scheduler)
1. Copy the project files to a folder on your NAS (e.g., `/volume1/docker/synophoto-cull`).
2. Install Node.js from the Synology Package Center.
3. Use a symlink to connect your photo library:
   ```bash
   ln -s /volume1/photo/MyLibrary /volume1/docker/synophoto-cull/photos
   ```
4. Run `npm install` and `npm run dev`.

---

## 📱 Accessing from Mobile

Reviewing photos from your couch is one of the best ways to cull!

1. **Find your NAS IP**: Go to Synology Control Panel > Info Center (e.g., `192.168.1.50`).
2. **Open Browser**: On your phone, navigate to `http://192.168.1.50:3000`.
3. **Firewall Check**: Ensure your Synology Firewall (Control Panel > Security > Firewall) allows incoming traffic on port `3000`.
4. **PWA Tip**: On iOS (Safari) or Android (Chrome), use "Add to Home Screen" to run the app in full-screen mode without browser bars.

---

## ⌨️ Keyboard Shortcuts (Desktop)

| Key | Action |
|-----|--------|
| `→` | Next Photo |
| `←` | Previous Photo |
| `K` | **Keep** & Move Next |
| `T` | **Trash** & Move Next |
| `G` | Toggle Grid/Detail View |
| `Backspace` | Trash & Move Next |

---

## 🔄 The Culling Workflow

1. **Review**: Go through your photos in Detail View.
2. **Decide**: Mark each as "Keep" or "Trash". Decisions are saved instantly to a local SQLite database.
3. **Apply**: Once finished, click the **Apply** button in the header.
4. **Cleanup**: All photos marked as "Trash" will be moved to a `.trash` folder inside your photo directory. You can then delete that folder manually from File Station once you're 100% sure.

---

*Note: This app is a tool for professional and hobbyist photographers. Always ensure you have a backup of your original photos before performing bulk move operations.*
