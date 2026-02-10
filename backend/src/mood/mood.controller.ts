import { Body, Controller, Post, Get } from '@nestjs/common';
import { MoodService } from './mood.service';

@Controller('mood')
export class MoodController {
    constructor(private readonly moodService: MoodService) { }

    @Post('analyze')
    async analyze(@Body('text') text: string) {
        return this.moodService.analyzeText(text);
    }

    @Get('list')
    getMoods() {
        return this.moodService.getMoodsContext();
    }
}
