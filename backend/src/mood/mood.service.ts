import { Injectable, Logger } from '@nestjs/common';
import { OpenAiStrategy } from './strategies/openai-strategy';
import * as moodData from '../assets/moods.json';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class MoodService {
    private strategy: OpenAiStrategy;
    private readonly logger = new Logger(MoodService.name);

    constructor(strategy: OpenAiStrategy) {
        this.strategy = strategy;
    }

    getMoodsContext() {
        return moodData;
    }

    async analyzeText(text: string) {
        // We pass the full mood data as context
        // In a real app, we might want to prune this context or allow selection
        const sections = await this.strategy.analyzeText(text, moodData);

        // Enrich sections with audioUrl
        const enrichedSections = await Promise.all(sections.map(async (section) => {
            const audioUrl = await this.resolveAudioUrl(section.mood);
            return {
                ...section,
                audioUrl
            };
        }));

        return enrichedSections;
    }

    private async resolveAudioUrl(moodPath: string): Promise<string | undefined> {
        // moodPath: "Category.SubCategory.MoodName"
        // Convert to path: "Category/SubCategory/MoodName"
        const relativePath = moodPath.split('.').join(path.sep);

        // Base dir: assume we are in backend root, so check ../frontend/public/reading-bg-sounds
        // We use process.cwd() which is usually project root (backend folder)
        const baseDir = path.resolve(process.cwd(), '../frontend/public/reading-bg-sounds');

        const fullPath = path.join(baseDir, relativePath);

        try {
            // Check if directory exists
            try {
                const stat = await fs.stat(fullPath);
                if (stat.isDirectory()) {
                    const files = await fs.readdir(fullPath);
                    const audioFiles = files.filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
                    if (audioFiles.length > 0) {
                        const randomFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
                        // Return URL path (for frontend use)
                        // /reading-bg-sounds/Category/SubCategory/MoodName/randomFile.mp3
                        const urlPath = `/reading-bg-sounds/${moodPath.split('.').join('/')}/${randomFile}`;
                        return urlPath;
                    }
                }
            } catch (err) {
                // Directory might not exist, maybe try case insensitive search or partial match?
                // For now, log warning
                this.logger.warn(`Path not found: ${fullPath}`);
            }
        } catch (e) {
            this.logger.warn(`Could not resolve audio for mood: ${moodPath}`, e);
        }
        return undefined;
    }
}
