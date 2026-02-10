import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoodModule } from './mood/mood.module';

@Module({
  imports: [ConfigModule.forRoot(), MoodModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
