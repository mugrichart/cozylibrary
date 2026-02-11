import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ReadingRecordDocument = ReadingRecord & Document;

@Schema({ timestamps: true })
export class ReadingRecord {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    userId: MongooseSchema.Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Book', required: true })
    bookId: MongooseSchema.Types.ObjectId;

    @Prop({ default: 1 })
    lastPage: number;
}

export const ReadingRecordSchema = SchemaFactory.createForClass(ReadingRecord);

// Unique index for user and book
ReadingRecordSchema.index({ userId: 1, bookId: 1 }, { unique: true });
