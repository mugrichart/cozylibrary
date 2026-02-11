import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BookDocument = Book & Document;

@Schema({ timestamps: true })
export class Book {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    s3Key: string;

    @Prop({ required: true })
    s3Url: string;

    @Prop()
    coverImageUrl: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: MongooseSchema.Types.ObjectId;
}

export const BookSchema = SchemaFactory.createForClass(Book);
