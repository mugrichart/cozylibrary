import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MoodController } from './mood.controller';
import { MoodService } from './mood.service';
import { OpenAiStrategy } from './strategies/openai-strategy';

@Module({
    imports: [ConfigModule],
    controllers: [MoodController],
    providers: [MoodService, OpenAiStrategy],
    exports: [MoodService],
})
export class MoodModule { }
