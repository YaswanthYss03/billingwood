import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Updating tenant subscription dates...\n');
    
    const tenant = await prisma.tenant.findFirst({
      where: {
        subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });

    if (!tenant) {
      console.log('No PROFESSIONAL tenant found');
      return;
    }

    console.log(`Found tenant: ${tenant.name} (${tenant.id})`);
    console.log(`Current subscription end date: ${tenant.subscriptionEndDate}`);
    
    // Set subscription dates
    const now = new Date();
    const subscriptionStartDate = tenant.subscriptionStartDate || now;
    const subscriptionEndDate = tenant.subscriptionEndDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStartDate: subscriptionStartDate,
        subscriptionEndDate: subscriptionEndDate,
        // Clear trial dates for an active subscription
        trialStartDate: null,
        trialEndDate: null,
      },
    });

    console.log('\n✅ Updated successfully!');
    console.log(`Subscription Start: ${updated.subscriptionStartDate}`);
    console.log(`Subscription End: ${updated.subscriptionEndDate}`);
    console.log(`Days until expiry: ${Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
