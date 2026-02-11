import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './book.schema';
import { ReadingRecord, ReadingRecordDocument } from './reading-record.schema';
import { S3Service } from './s3.service';

@Injectable()
export class BooksService {
    constructor(
        @InjectModel(Book.name) private bookModel: Model<BookDocument>,
        @InjectModel(ReadingRecord.name) private recordModel: Model<ReadingRecordDocument>,
        private s3Service: S3Service,
    ) { }

    async uploadBook(file: Express.Multer.File, userId: string, coverImageUrl?: string): Promise<BookDocument> {
        // Upload the PDF
        const { key, url } = await this.s3Service.uploadFile(file);

        const book = new this.bookModel({
            title: file.originalname.replace('.pdf', ''),
            s3Key: key,
            s3Url: url,
            coverImageUrl,
            userId,
        });

        return book.save();
    }

    async getUserBooks(userId: string): Promise<BookDocument[]> {
        return this.bookModel.find({ userId: userId as any }).sort({ createdAt: -1 }).exec();
    }

    async getBookById(bookId: string): Promise<BookDocument | null> {
        return this.bookModel.findById(bookId).exec();
    }

    async saveProgress(userId: string, bookId: string, page: number): Promise<ReadingRecordDocument | null> {
        return this.recordModel.findOneAndUpdate(
            { userId: userId as any, bookId: bookId as any },
            { lastPage: page },
            { upsert: true, new: true }
        ).exec();
    }

    async getProgress(userId: string, bookId: string): Promise<ReadingRecordDocument | null> {
        return this.recordModel.findOne({ userId: userId as any, bookId: bookId as any }).exec();
    }
}
