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
        // Generate a list of valid paths from moodContext for the LLM
        const validPaths: string[] = [];
        for (const [category, subCats] of Object.entries(moodContext)) {
            if (typeof subCats === 'object' && subCats !== null) {
                for (const [subCategory, moods] of Object.entries(subCats)) {
                    if (Array.isArray(moods)) {
                        moods.forEach(mood => {
                            validPaths.push(`${category}.${subCategory}.${mood}`);
                        });
                    }
                }
            }
        }

        const prompt = `
You are an expert literary mood analyst.
Your task is to divide the provided text into contiguous sections based on the shifting mood and tone.

For each section, you must choose EXACTLY ONE mood path from the list of valid paths provided below.
DO NOT create new paths. DO NOT misspell them.

Valid Mood Paths:
${validPaths.join('\n')}

Return a JSON object with a "sections" key containing an array of objects. Each object must have:
- "start": The exact starting sentence or phrase of the section.
- "end": The exact ending sentence or phrase of the section.
- "mood": The exact dot-notation path chosen from the list above.

The "start" and "end" values MUST be exact substrings from the provided text.

Text to Analyze (delimited by triple backticks):
\`\`\`
${text}
\`\`\`

Return ONLY valid JSON.
`;

        let content = '';
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            content = response.choices[0]?.message?.content?.trim() || '';
            if (!content) {
                throw new Error('No content received from OpenAI');
            }

            // Only attempt to fix literal control characters IF they are breaking JSON
            // But with JSON mode, we should first try to parse normally.
            try {
                const result = JSON.parse(content);
                return result.sections || [];
            } catch (parseError) {
                // If it fails, it might be due to raw control characters in strings
                this.logger.warn('Initial JSON parse failed, attempting sanitization of control characters...');
                const sanitized = content.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
                    // Only replace characters that are NOT standard whitespace allowed in JSON
                    if (match === '\n' || match === '\r' || match === '\t') return match;
                    return '';
                });

                // If the error was specifically "Bad control character", it's usually a literal newline in a string
                // We can try to escape those specifically.
                const escaped = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                // But wait, escaping ALL newlines breaks the JSON if they are outside strings.
                // This is why JSON mode is preferred. Let's just log the error and content for now.

                this.logger.error(`JSON Parse Error: ${parseError.message}`);
                this.logger.error(`Raw content was: ${content}`);
                throw parseError;
            }
        } catch (error) {
            this.logger.error('Failed to analyze text with OpenAI', error);
            throw error;
        }
    }
}
