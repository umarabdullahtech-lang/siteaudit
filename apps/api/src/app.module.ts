import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CrawlerModule } from './crawler/crawler.module';
import { QueueModule } from './queue/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { MongoModule } from './mongo/mongo.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,
    MongoModule,
    AuthModule,
    AuditModule,
    CrawlerModule,
    QueueModule,
    WebsocketModule,
    AiModule,
    HealthModule,
  ],
})
export class AppModule {}
