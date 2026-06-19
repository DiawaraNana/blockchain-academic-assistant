// backend/src/services/storage.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../../data/announcements');

// Ensure directory exists
if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
}

export function saveAnnouncementContent(id: number, content: string): void {
    const filePath = path.join(CONTENT_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ id, content, timestamp: Date.now() }));
}

export function getAnnouncementContent(id: number): string | null {
    const filePath = path.join(CONTENT_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return data.content;
    }
    return null;
}

export function getAllAnnouncementsWithContent(): any[] {
    const files = fs.readdirSync(CONTENT_DIR);
    return files.map(file => {
        const data = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8'));
        return data;
    }).sort((a, b) => b.id - a.id);
}