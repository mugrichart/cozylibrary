import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmStrategy, MoodSection } from './llm-strategy.interface';

@Injectable()
export class OpenAiStrategy implements LlmStrategy {
    private openai: OpenAI;
    private readonly logger = new Logger(OpenAiStrategy.name);

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            this.logger.warn('OPENAI_API_KEY is not set. Mood analysis will fail.');
        }
        this.openai = new OpenAI({
            apiKey: apiKey,
        });
    }

    async analyzeText(text: string, moodContext: any): Promise<MoodSection[]> {
        const prompt = `
You are an expert literary mood analyst.
Your task is to divide the following text into sections based on the mood.
You must use the provided mood categories from the JSON context below.
Return a JSON array of objects, where each object has:
- "start": The exact starting sentence or phrase of the section.
- "end": The exact ending sentence or phrase of the section.
- "mood": The dot-notation path of the chosen mood from the context (e.g., "Organic_Ancient.Cognitive.Observational").

The sections must cover the entire text contiguously.
IMPORTANT: The "start" and "end" values MUST be exact substrings from the provided text.

Mood Context JSON:
${JSON.stringify(moodContext, null, 2)}

Text to Analyze:
"${text}"

Return ONLY the JSON array. Do not include markdown formatting or explanations.
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            });

            const content = response.choices[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('No content received from OpenAI');
            }

            // Remove markdown code blocks if present
            const jsonStr = content.replace(/^```json/, '').replace(/```$/, '').trim();

            const sections = JSON.parse(jsonStr) as MoodSection[];
            return sections;
        } catch (error) {
            this.logger.error('Failed to analyze text with OpenAI', error);
            throw error;
        }
    }
}
