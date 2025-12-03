const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prismaMaster = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres123@db:5432/medmanager_master'
    }
  }
});

async function createAdminUser() {
  try {
    const password = 'admin123456';
    const hash = await bcrypt.hash(password, 12);
    
    console.log('Creating admin user with hash:', hash);
    
    const user = await prismaMaster.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: hash,
        role: 'ADMIN',
        isActive: true
      },
      create: {
        id: require('crypto').randomUUID(),
        email: 'admin@example.com',
        password: hash,
        name: 'System Admin',
        role: 'ADMIN',
        isActive: true,
        permissions: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Admin user created/updated:', user.email);
    
    // Verify password
    const verifyHash = await bcrypt.hash(password, 12);
    console.log('Test hash:', verifyHash);
    const matches = await bcrypt.compare(password, user.password);
    console.log('Password verification:', matches);
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prismaMaster.$disconnect();
  }
}

createAdminUser();
