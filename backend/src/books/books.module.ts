import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { S3Service } from './s3.service';
import { Book, BookSchema } from './book.schema';
import { ReadingRecord, ReadingRecordSchema } from './reading-record.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Book.name, schema: BookSchema },
            { name: ReadingRecord.name, schema: ReadingRecordSchema },
        ]),
    ],
    controllers: [BooksController],
    providers: [BooksService, S3Service],
    exports: [BooksService],
})
export class BooksModule { }
