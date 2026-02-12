import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(WebsocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToAudit')
  handleSubscribe(client: Socket, auditId: string) {
    client.join(`audit:${auditId}`);
    this.logger.log(`Client ${client.id} subscribed to audit ${auditId}`);
  }

  @SubscribeMessage('unsubscribeFromAudit')
  handleUnsubscribe(client: Socket, auditId: string) {
    client.leave(`audit:${auditId}`);
  }

  sendAuditProgress(auditId: string, progress: number, status: string) {
    this.server.to(`audit:${auditId}`).emit('auditProgress', {
      auditId,
      progress,
      status,
    });
  }

  sendAuditComplete(auditId: string, results: any) {
    this.server.to(`audit:${auditId}`).emit('auditComplete', {
      auditId,
      results,
    });
  }

  sendAuditError(auditId: string, error: string) {
    this.server.to(`audit:${auditId}`).emit('auditError', {
      auditId,
      error,
    });
  }
}
