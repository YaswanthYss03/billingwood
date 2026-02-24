import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking tenants...');
    
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialStartDate: true,
        trialEndDate: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
      },
    });

    console.log(`Found ${tenants.length} tenants:\n`);
    
    tenants.forEach((tenant) => {
      console.log('-------------------');
      console.log(`ID: ${tenant.id}`);
      console.log(`Name: ${tenant.name}`);
      console.log(`Plan: ${tenant.subscriptionPlan || 'NULL'}`);
      console.log(`Status: ${tenant.subscriptionStatus || 'NULL'}`);
      console.log(`Trial Start: ${tenant.trialStartDate || 'NULL'}`);
      console.log(`Trial End: ${tenant.trialEndDate || 'NULL'}`);
      console.log(`Sub Start: ${tenant.subscriptionStartDate || 'NULL'}`);
      console.log(`Sub End: ${tenant.subscriptionEndDate || 'NULL'}`);
      console.log('');
    });

    // Now check users and their tenantIds
    console.log('\n\nChecking users and their tenant associations...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        tenantId: true,
        role: true,
      },
      take: 10,
    });

    console.log(`Found ${users.length} users:\n`);
    users.forEach((user) => {
      console.log(`User: ${user.username} (${user.name}) - Tenant ID: ${user.tenantId || 'NULL'} - Role: ${user.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
