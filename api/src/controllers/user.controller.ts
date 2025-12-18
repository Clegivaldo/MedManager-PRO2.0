import { Request, Response } from 'express';
import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getRolePermissions } from '../middleware/permissions.js';
import { auditLog } from '../utils/audit.js';

const prisma = new PrismaClientRuntime();

export class UserController {
  listUsers = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, role, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (role) where.role = role;
      if (status) where.isActive = status === 'active';

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: offset,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastAccess: true
          }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error listing users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  createUser = async (req: Request, res: Response) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const permissions = getRolePermissions(role);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          permissions: JSON.stringify(permissions),
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'User',
        recordId: user.id,
        operation: 'CREATE',
        newData: { name, email, role }
      });

      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findFirst({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          lastAccess: true
        }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ user });
    } catch (error) {
      logger.error('Error getting user:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await prisma.user.findFirst({
        where: { id }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'User',
        recordId: id,
        operation: 'UPDATE',
        newData: updates
      });

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findFirst({
        where: { id }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Prevent deleting yourself
      if (id === req.user!.userId) {
        throw new AppError('Cannot delete your own account', 400);
      }

      // Prevent deleting the last admin
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true }
      });

      if (user.role === 'ADMIN' && adminCount <= 1) {
        throw new AppError('Cannot delete the last admin user', 400);
      }

      await prisma.user.delete({
        where: { id }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'User',
        recordId: id,
        operation: 'DELETE',
        oldData: { name: user.name, email: user.email }
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error('Error deleting user:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateUserRole = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await prisma.user.findFirst({
        where: { id }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Prevent changing your own role
      if (id === req.user!.userId) {
        throw new AppError('Cannot change your own role', 400);
      }

      // Prevent removing admin role from the last admin
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true }
      });

      if (user.role === 'ADMIN' && role !== 'ADMIN' && adminCount <= 1) {
        throw new AppError('Cannot remove admin role from the last admin user', 400);
      }

      const permissions = getRolePermissions(role);

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { 
          role,
          permissions: JSON.stringify(permissions)
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          updatedAt: true
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'User',
        recordId: id,
        operation: 'UPDATE',
        newData: { oldRole: user.role, newRole: role }
      });

      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating user role:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateUserPermissions = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      const user = await prisma.user.findFirst({
        where: { id }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { permissions: JSON.stringify(permissions) },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          updatedAt: true
        }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'User',
        recordId: id,
        operation: 'UPDATE',
        newData: { permissions }
      });

      res.json({
        message: 'User permissions updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating user permissions:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  getCurrentUser = async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
          lastAccess: true
        }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ user });
    } catch (error) {
      logger.error('Error getting current user:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  updateCurrentUser = async (req: Request, res: Response) => {
    try {
      const updates = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.userId },
        data: updates,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating current user:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId }
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { password: hashedNewPassword }
      });

      // Log audit trail
      await auditLog({
        tenantId: (req as any).tenant?.id || '',
        userId: req.user!.userId,
        tableName: 'User',
        recordId: req.user!.userId,
        operation: 'UPDATE'
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Error changing password:', error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}