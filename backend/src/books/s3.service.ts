import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(private configService: ConfigService) {
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

        this.s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
        this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME') || '';
    }

    async uploadFile(file: Express.Multer.File): Promise<{ key: string; url: string }> {
        const fileExtension = file.originalname.split('.').pop();
        const key = `books/${uuidv4()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this.s3Client.send(command);

        // Constructing the URL manually as S3 URL pattern is predictable
        // Format: https://bucket-name.s3.region.amazonaws.com/key
        const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

        return { key, url };
    }

    async uploadCoverImage(imageBuffer: Buffer, originalFilename: string): Promise<{ key: string; url: string }> {
        const key = `covers/${uuidv4()}.png`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/png',
        });

        await this.s3Client.send(command);

        const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

        return { key, url };
    }

    async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        await this.s3Client.send(command);
    }
}
