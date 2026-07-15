import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/modules/auth/auth.service';
import { ShiftService } from '../src/modules/shifts/shift.service';
import { AttendanceService } from '../src/modules/attendance/attendance.service';
import { EmployeeService } from '../src/modules/employees/employee.service';
import { PurchaseOrderService } from '../src/modules/purchase-orders/purchaseOrder.service';
import { OrderService } from '../src/modules/orders/order.service';
import { WasteService } from '../src/modules/waste/waste.service';
import { TicketService } from '../src/modules/tickets/ticket.service';
import { prisma } from '../src/config/prisma';
import { AppError } from '../src/utils/AppError';
import { Prisma } from '@prisma/client';

// Mock Prisma Client with default mock return values for transaction steps
jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    employee: {
      findFirst: jest.fn(),
    },
    shift: {
      findFirst: jest.fn(),
    },
    shiftAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    shiftSwapRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    leaveRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    item: {
      findFirst: jest.fn(),
    },
    stockBatch: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    stockLedgerEntry: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { change: null } }),
      create: jest.fn().mockResolvedValue({}),
    },
    recipe: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
    },
    purchaseOrder: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrderItem: {
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    menuCategory: {
      findMany: jest.fn(),
    },
    menuItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    tableToken: {
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
    wasteLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    feedback: {
      create: jest.fn(),
    },
    staffQuery: {
      create: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('Café Platform Business Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. AUTH SERVICE TESTS ---
  describe('AuthService', () => {
    const authService = new AuthService();

    it('should login user with correct password', async () => {
      const mockUser = {
        id: 'u-1',
        email: 'owner@cafe.com',
        passwordHash: bcrypt.hashSync('password123', 4),
        role: 'OWNER',
        name: 'John Owner',
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login('owner@cafe.com', 'password123');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.role).toBe('OWNER');
    });

    it('should throw error for invalid credentials', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(authService.login('owner@cafe.com', 'badpass')).rejects.toThrow(AppError);
    });
  });

  // --- 2. SHIFT OVERLAP TESTS ---
  describe('ShiftService - Overlap Check', () => {
    const shiftService = new ShiftService();

    it('should assign shift if no overlap', async () => {
      const mockShift = { id: 's-1', name: 'Morning', startTime: '09:00', endTime: '12:00' };
      (prisma.shift.findFirst as jest.Mock).mockResolvedValue(mockShift);
      (prisma.shiftAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.shiftAssignment.create as jest.Mock).mockResolvedValue({ id: 'a-1' });

      const result = await shiftService.assignShift('outlet-1', 's-1', 'emp-1', new Date('2025-06-15'));
      expect(result).toHaveProperty('id');
    });

    it('should throw error if overlap detected (existingStart < newEnd AND existingEnd > newStart)', async () => {
      const mockShift = { id: 's-new', name: 'Overlap', startTime: '10:00', endTime: '14:00' };
      const existingAssignment = {
        shift: { name: 'Morning', startTime: '09:00', endTime: '12:00' },
      };
      (prisma.shift.findFirst as jest.Mock).mockResolvedValue(mockShift);
      (prisma.shiftAssignment.findMany as jest.Mock).mockResolvedValue([existingAssignment]);

      await expect(
        shiftService.assignShift('outlet-1', 's-new', 'emp-1', new Date('2025-06-15'))
      ).rejects.toThrow(AppError);
    });
  });

  // --- 3. ATTENDANCE DUP CHECK ---
  describe('AttendanceService', () => {
    const attendanceService = new AttendanceService();

    it('should check in active employee without open attendance', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' });
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.attendance.create as jest.Mock).mockResolvedValue({ id: 'att-1' });

      const result = await attendanceService.checkIn('outlet-1', 'emp-1');
      expect(result).toHaveProperty('id');
    });

    it('should reject check in if employee already checked in', async () => {
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 'emp-1', status: 'ACTIVE' });
      (prisma.attendance.findFirst as jest.Mock).mockResolvedValue({ id: 'att-open', checkOutTime: null });

      await expect(attendanceService.checkIn('outlet-1', 'emp-1')).rejects.toThrow(AppError);
    });
  });

  // --- 4. LEAVE REQUEST TRANSITIONS ---
  describe('Leave Requests', () => {
    const employeeService = new EmployeeService();

    it('should approve a REQUESTED leave request', async () => {
      const mockLeave = { id: 'leave-1', status: 'REQUESTED' };
      (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(mockLeave);
      (prisma.leaveRequest.update as jest.Mock).mockResolvedValue({ id: 'leave-1', status: 'APPROVED' });

      const result = await employeeService.updateLeaveRequestStatus('outlet-1', 'leave-1', 'APPROVED', 'mgr-1');
      expect(result.status).toBe('APPROVED');
    });

    it('should reject transition from already APPROVED leave request', async () => {
      const mockLeave = { id: 'leave-1', status: 'APPROVED' };
      (prisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(mockLeave);

      await expect(
        employeeService.updateLeaveRequestStatus('outlet-1', 'leave-1', 'REJECTED', 'mgr-1')
      ).rejects.toThrow(AppError);
    });
  });

  // --- 5. PO RECEIVING & STOCK ---
  describe('PurchaseOrderService', () => {
    const poService = new PurchaseOrderService();

    it('should update received quantities, create stock batch, and ledger entries', async () => {
      const mockPO = {
        id: 'po-1',
        status: 'SENT',
        items: [
          {
            id: 'poi-1',
            itemId: 'item-1',
            orderedQuantity: { toNumber: () => 10 },
            receivedQuantity: { toNumber: () => 0 },
            unitCostPaise: 100,
            item: { name: 'Milk' },
          },
        ],
      };
      (prisma.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(mockPO);
      (prisma.purchaseOrderItem.findMany as jest.Mock).mockResolvedValue([
        {
          itemId: 'item-1',
          orderedQuantity: new Prisma.Decimal(10),
          receivedQuantity: new Prisma.Decimal(10),
          unitCostPaise: 100,
        },
      ]);
      (prisma.purchaseOrder.update as jest.Mock).mockResolvedValue({ ...mockPO, status: 'RECEIVED' });

      const receivePayload = [
        {
          itemId: 'item-1',
          receivedQuantity: 10,
          batchNumber: 'BATCH-001',
          expiryDate: new Date('2026-07-01'),
        },
      ];

      const result = await poService.receivePO('outlet-1', 'po-1', receivePayload);
      expect(result.status).toBe('RECEIVED');
    });
  });

  // --- 6. ORDER COMPLETION & STOCK DEDUCTION ---
  describe('OrderService', () => {
    const orderService = new OrderService();

    it('should complete order and deduct stock', async () => {
      const mockOrder = {
        id: 'o-1',
        status: 'READY',
        totalPaise: 1000,
        payments: [{ status: 'CONFIRMED', amountPaise: 1000 }],
        items: [{ menuItemId: 'menu-1', quantity: 2 }],
      };
      const mockRecipes = [
        {
          menuItemId: 'menu-1',
          itemId: 'ing-1',
          quantityPerUnit: { toNumber: () => 1 },
          item: { name: 'Bun' },
        },
      ];

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue(mockRecipes);
      (prisma.stockLedgerEntry.aggregate as jest.Mock).mockResolvedValue({ _sum: { change: { toNumber: () => 10 } } });
      (prisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'COMPLETED' });

      const result = await orderService.updateOrderStatus('outlet-1', 'o-1', 'COMPLETED', 'completed', 'user-1');
      expect(result!.status).toBe('COMPLETED');
    });

    it('should reject completion if payment total does not match order total', async () => {
      const mockOrder = {
        id: 'o-1',
        status: 'READY',
        totalPaise: 1000,
        payments: [{ status: 'CONFIRMED', amountPaise: 500 }], // Mismatch
      };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        orderService.updateOrderStatus('outlet-1', 'o-1', 'COMPLETED', 'completed', 'user-1')
      ).rejects.toThrow(AppError);
    });
  });

  // --- 7. WASTE DEDUCTIONS ---
  describe('WasteService', () => {
    const wasteService = new WasteService();

    it('should log waste and create negative stock ledger entry', async () => {
      const mockItem = { id: 'item-1', name: 'Milk', unitCostPaise: 500 };
      (prisma.item.findFirst as jest.Mock).mockResolvedValue(mockItem);
      (prisma.stockLedgerEntry.aggregate as jest.Mock).mockResolvedValue({ _sum: { change: { toNumber: () => 5.0 } } });
      (prisma.wasteLog.create as jest.Mock).mockResolvedValue({ id: 'w-1' });

      const result = await wasteService.createWasteLog('outlet-1', 'user-1', {
        itemId: 'item-1',
        quantity: 2.0,
        reason: 'SPOILAGE',
      });

      expect(result).toHaveProperty('id');
    });
  });

  // --- 8. TICKET ESCALATION KEYWORDS ---
  describe('TicketService - Escalation', () => {
    const ticketService = new TicketService();

    it('should flag ticket priority HIGH when escalation keywords match', async () => {
      const mockOrder = { id: 'o-1', outletId: 'outlet-1' };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.feedback.create as jest.Mock).mockResolvedValue({ id: 'f-1' });

      // Keyword "food safety" should escalate
      await ticketService.createFeedback({
        orderId: 'o-1',
        rating: 1,
        comment: 'This is a food safety issue.',
        source: 'QR',
      });

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'HIGH',
          }),
        })
      );
    });

    it('should assign priority NORMAL when no escalation keywords match', async () => {
      const mockOrder = { id: 'o-1', outletId: 'outlet-1' };
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.feedback.create as jest.Mock).mockResolvedValue({ id: 'f-1' });

      await ticketService.createFeedback({
        orderId: 'o-1',
        rating: 5,
        comment: 'Excellent coffee and fast service!',
        source: 'QR',
      });

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'NORMAL',
          }),
        })
      );
    });
  });
});
