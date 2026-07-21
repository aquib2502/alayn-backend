import { PrismaClient, Role, EmployeeStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash passwords
  const passwordHash = bcrypt.hashSync('password123', 10);

  // 1. Create Business
  const business = await prisma.business.create({
    data: {
      name: 'Central Alayn Group',
    },
  });

  // 1.1 Create Subscription
  await prisma.subscription.create({
    data: {
      businessId: business.id,
      status: 'ACTIVE',
      planId: 'BASIC',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // 1.2 Create Outlets
  const outletA = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'Central Alayn (Outlet A)',
      address: '123 Main Street, Cityville',
      cgstRateDecimal: 9.0,
      sgstRateDecimal: 9.0,
    },
  });

  const outletB = await prisma.outlet.create({
    data: {
      businessId: business.id,
      name: 'North Alayn (Outlet B)',
      address: '456 North Avenue, Townsville',
      cgstRateDecimal: 9.0,
      sgstRateDecimal: 9.0,
    },
  });

  console.log(`Created outlets: ${outletA.id}, ${outletB.id}`);

  // 2. Create Users
  const ownerUser = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'owner@alayn.com',
      passwordHash,
      name: 'John Owner',
      role: Role.BUSINESS_OWNER,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'manager@alayn.com',
      passwordHash,
      name: 'Jane Manager',
      role: Role.MANAGER,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'staff@alayn.com',
      passwordHash,
      name: 'Sam Staff',
      role: Role.STAFF,
    },
  });

  const kitchenUser = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'kitchen@alayn.com',
      passwordHash,
      name: 'Kevin Kitchen',
      role: Role.KITCHEN,
    },
  });

  console.log('Created users');

  // 3. User Outlet Assignments
  // Owner is not strictly required to be assigned, but let's assign all users appropriately
  await prisma.userOutlet.createMany({
    data: [
      { userId: ownerUser.id, outletId: outletA.id },
      { userId: ownerUser.id, outletId: outletB.id },
      { userId: managerUser.id, outletId: outletA.id },
      { userId: staffUser.id, outletId: outletA.id },
      { userId: kitchenUser.id, outletId: outletA.id },
    ],
  });

  // 4. Create Employees
  const managerEmp = await prisma.employee.create({
    data: {
      outletId: outletA.id,
      userId: managerUser.id,
      name: 'Jane Manager',
      phone: '1234567890',
      role: Role.MANAGER,
      joiningDate: new Date('2025-01-01'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  const staffEmp = await prisma.employee.create({
    data: {
      outletId: outletA.id,
      userId: staffUser.id,
      name: 'Sam Staff',
      phone: '9876543210',
      role: Role.STAFF,
      joiningDate: new Date('2025-02-01'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  const kitchenEmp = await prisma.employee.create({
    data: {
      outletId: outletA.id,
      userId: kitchenUser.id,
      name: 'Kevin Kitchen',
      phone: '5555555555',
      role: Role.KITCHEN,
      joiningDate: new Date('2025-02-15'),
      status: EmployeeStatus.ACTIVE,
    },
  });

  console.log('Created employees');

  // 5. Create Suppliers
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Mega Foods Inc.',
      contactPerson: 'Bob Supplier',
      phone: '1112223333',
      email: 'bob@megafoods.com',
      address: '789 Supply Rd, Industrial Area',
      outletId: outletA.id,
    },
  });

  // 6. Create Inventory Items
  const bread = await prisma.item.create({
    data: {
      name: 'Burger Bun',
      sku: 'BUN-001',
      category: 'Bakery',
      unit: 'pcs',
      reorderThreshold: 10,
      unitCostPaise: 500, // ₹5.00
      outletId: outletA.id,
    },
  });

  const patty = await prisma.item.create({
    data: {
      name: 'Chicken Patty',
      sku: 'PAT-001',
      category: 'Frozen',
      unit: 'pcs',
      reorderThreshold: 15,
      unitCostPaise: 3000, // ₹30.00
      outletId: outletA.id,
    },
  });

  const cheese = await prisma.item.create({
    data: {
      name: 'Cheese Slices',
      sku: 'CHS-001',
      category: 'Dairy',
      unit: 'kg',
      reorderThreshold: 2.0,
      unitCostPaise: 40000, // ₹400.00 per kg
      outletId: outletA.id,
    },
  });

  console.log('Created inventory items');

  // 7. Create Menu Categories & Items
  const foodCategory = await prisma.menuCategory.create({
    data: {
      name: 'Burgers',
      description: 'Gourmet burgers and sliders',
      isActive: true,
      outletId: outletA.id,
    },
  });

  const burgerMenuItem = await prisma.menuItem.create({
    data: {
      name: 'Classic Chicken Burger',
      description: 'Toasty bun with juicy patty and melted cheese',
      pricePaise: 15000, // ₹150.00
      categoryId: foodCategory.id,
      isActive: true,
      outletId: outletA.id,
    },
  });

  console.log('Created menu items');

  // 8. Recipes
  await prisma.recipe.createMany({
    data: [
      { menuItemId: burgerMenuItem.id, itemId: bread.id, quantityPerUnit: 1.0 },
      { menuItemId: burgerMenuItem.id, itemId: patty.id, quantityPerUnit: 1.0 },
      { menuItemId: burgerMenuItem.id, itemId: cheese.id, quantityPerUnit: 0.05 }, // 50g
    ],
  });

  console.log('Created recipes');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
