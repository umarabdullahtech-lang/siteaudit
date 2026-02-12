import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private connection: typeof mongoose | null = null;

  async onModuleInit() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/siteaudit';
    this.connection = await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');
  }

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.disconnect();
    }
  }

  getConnection() {
    return this.connection;
  }
}
