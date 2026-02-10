
export interface MoodSection {
    start: string; // The starting sentence or text snippet
    end: string;   // The ending sentence or text snippet
    mood: string;  // Path like "Organic_Ancient.Cognitive.Observational"
    audioUrl?: string;
}

export interface LlmStrategy {
    analyzeText(text: string, moodContext: any): Promise<MoodSection[]>;
}
