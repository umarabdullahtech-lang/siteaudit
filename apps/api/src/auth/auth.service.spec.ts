import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test User',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('notfound@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@test.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return auth response with token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        password: 'hashed',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.email).toBe('test@test.com');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should create user and return auth response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'new@test.com',
        name: 'New User',
        password: 'hashed-password',
      });

      const result = await service.register({
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('test-jwt-token');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'taken@test.com',
      });

      await expect(
        service.register({
          name: 'Test',
          email: 'taken@test.com',
          password: 'password',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
