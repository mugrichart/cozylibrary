import {
    Controller,
    Post,
    Get,
    Body,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    Request,
    Param,
    Patch,
    Delete
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { BooksService } from './books.service';
import { S3Service } from './s3.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BooksController {
    constructor(
        private readonly booksService: BooksService,
        private readonly s3Service: S3Service,
    ) { }

    @Post('upload')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]))
    async uploadFile(
        @UploadedFiles() files: { file?: Express.Multer.File[], cover?: Express.Multer.File[] },
        @Request() req
    ) {
        const pdfFile = files.file?.[0];
        const coverFile = files.cover?.[0];

        if (!pdfFile) {
            throw new Error('PDF file is required');
        }

        let coverImageUrl: string | undefined;
        if (coverFile) {
            const coverResult = await this.s3Service.uploadCoverImage(coverFile.buffer, pdfFile.originalname);
            coverImageUrl = coverResult.url;
        }

        return this.booksService.uploadBook(pdfFile, req.user.id, coverImageUrl);
    }

    @Get()
    async getMyBooks(@Request() req) {
        return this.booksService.getUserBooks(req.user.id);
    }

    @Get(':id')
    async getBook(@Param('id') id: string) {
        return this.booksService.getBookById(id);
    }

    @Patch(':id/progress')
    async saveProgress(
        @Param('id') bookId: string,
        @Body('page') page: number,
        @Request() req
    ) {
        return this.booksService.saveProgress(req.user.id, bookId, page);
    }

    @Get(':id/progress')
    async getProgress(@Param('id') bookId: string, @Request() req) {
        const record = await this.booksService.getProgress(req.user.id, bookId);
        return record || { lastPage: 1 };
    }

    @Delete(':id')
    async deleteBook(@Param('id') bookId: string, @Request() req) {
        await this.booksService.deleteBook(bookId, req.user.id);
        return { message: 'Book deleted successfully' };
    }
}
