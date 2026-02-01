import moodsData from './moods.json';

export type MoodCategory = keyof typeof moodsData;

export interface MoodSegment {
    startIndex: number;
    endIndex: number;
    mood: string;
    audioPath?: string;
}

/**
 * Divides a list of strings (lines) into mood segments.
 * For testing, we focus on the Ethereal_Abstract category.
 */
export function segmentTextByMood(lines: string[]): MoodSegment[] {
    if (lines.length === 0) return [];

    const ethereal = moodsData.Ethereal_Abstract;
    // Extract available moods with audio
    const availableMoods: { name: string; path: string }[] = [];

    Object.entries(ethereal).forEach(([subCat, subMoods]) => {
        if (typeof subMoods === 'object' && !Array.isArray(subMoods)) {
            Object.entries(subMoods).forEach(([moodName, paths]) => {
                if (Array.isArray(paths) && paths.length > 0) {
                    availableMoods.push({ name: moodName, path: paths[0] });
                }
            });
        }
    });

    if (availableMoods.length === 0) {
        return [{ startIndex: 0, endIndex: lines.length - 1, mood: 'Default' }];
    }

    const segments: MoodSegment[] = [];
    const segmentSize = Math.max(1, Math.floor(lines.length / availableMoods.length));

    for (let i = 0; i < availableMoods.length; i++) {
        const startIndex = i * segmentSize;
        const endIndex = (i === availableMoods.length - 1) ? lines.length - 1 : (i + 1) * segmentSize - 1;

        if (startIndex < lines.length) {
            segments.push({
                startIndex,
                endIndex,
                mood: availableMoods[i].name,
                audioPath: availableMoods[i].path
            });
        }
    }

    return segments;
}
