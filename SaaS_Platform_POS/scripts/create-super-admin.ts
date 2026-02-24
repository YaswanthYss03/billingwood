import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating super admin user...');

  const username = 'Pavakiepos';
  const password = 'Pavakiepos@666';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if super admin already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log('Super admin user already exists. Updating password...');
    await prisma.user.update({
      where: { username },
      data: {
        password: hashedPassword,
        email: 'support@pavakie.com',
        phone: '8608084220',
        name: 'Yaswanth',
      },
    });
    console.log('Super admin password updated successfully!');
  } else {
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: 'support@pavakie.com',
        phone: '8608084220',
        name: 'Yaswanth',
        role: UserRole.SUPER_ADMIN,
        tenantId: null, // Super admin is not tied to any tenant
        isActive: true,
      },
    });
    console.log('Super admin user created successfully!');
  }

  console.log('\nSuper Admin Credentials:');
  console.log('Username:', username);
  console.log('Password:', password);
}

main()
  .catch((e) => {
    console.error('Error creating super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
