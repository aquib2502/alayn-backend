import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import outletRoutes from '../modules/outlet/outlet.routes';
import employeeRoutes, { leaveRouter } from '../modules/employees/employee.routes';
import shiftRoutes from '../modules/shifts/shift.routes';
import attendanceRoutes from '../modules/attendance/attendance.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes';
import purchaseOrderRoutes from '../modules/purchase-orders/purchaseOrder.routes';
import menuRoutes from '../modules/menu/menu.routes';
import orderRoutes, { kitchenRouter } from '../modules/orders/order.routes';
import wasteRoutes from '../modules/waste/waste.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import dashboardRoutes from '../modules/analytics/dashboard.routes';
import ticketRoutes from '../modules/tickets/ticket.routes';

const router = Router();

// Bind all routes under /api/v1
router.use('/auth', authRoutes);
router.use('/outlets', outletRoutes);
router.use('/employees', employeeRoutes);
router.use('/leave-requests', leaveRouter);
router.use('/shifts', shiftRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/kitchen', kitchenRouter);
router.use('/waste-logs', wasteRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);

// Bind ticket, feedback, and staff query routes
router.use('/', ticketRoutes);

export default router;
