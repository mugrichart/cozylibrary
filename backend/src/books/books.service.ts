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

    async deleteBook(bookId: string, userId: string): Promise<void> {
        const book = await this.bookModel.findById(bookId).exec();

        if (!book) {
            throw new Error('Book not found');
        }

        // Verify the book belongs to the user
        if (book.userId.toString() !== userId) {
            throw new Error('Unauthorized to delete this book');
        }

        // Delete the PDF from S3
        await this.s3Service.deleteFile(book.s3Key);

        // Delete the cover image from S3 if it exists
        if (book.coverImageUrl) {
            // Extract the key from the URL
            const coverKey = book.coverImageUrl.split('.amazonaws.com/')[1];
            if (coverKey) {
                await this.s3Service.deleteFile(coverKey);
            }
        }

        // Delete reading records associated with this book
        await this.recordModel.deleteMany({ bookId: bookId as any }).exec();

        // Delete the book from the database
        await this.bookModel.findByIdAndDelete(bookId).exec();
    }
}
