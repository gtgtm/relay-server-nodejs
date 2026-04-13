require('dotenv').config();

const sequelize = require('../config/database');
const logger = require('../config/logger');
const { User, Device } = require('../models');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Create or get admin user
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        password: 'admin_password_change_me',
        name: 'Admin User',
        role: 'admin',
        isActive: true,
      },
    });

    logger.info(`${adminCreated ? 'Created' : 'Found existing'} admin user: ${adminUser.email}`);

    // Create or get test user
    const [testUser, testCreated] = await User.findOrCreate({
      where: { email: 'test@example.com' },
      defaults: {
        password: 'password123',
        name: 'Test User',
        role: 'user',
        isActive: true,
      },
    });

    logger.info(`${testCreated ? 'Created' : 'Found existing'} test user: ${testUser.email}`);

    // Create sample camera device for test user (if not exists)
    const cameraId = Math.random().toString(16).slice(2, 10);
    const [cameraDevice, cameraCreated] = await Device.findOrCreate({
      where: { cameraId },
      defaults: {
        userId: testUser.id,
        name: 'Test Camera',
        role: 'camera',
        isActive: true,
      },
    });

    logger.info(`${cameraCreated ? 'Created' : 'Found existing'} sample camera device: ${cameraDevice.cameraId}`);

    logger.info('Database seeding completed successfully');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error.message);
    if (error.errors) {
      error.errors.forEach(e => logger.error('  -', e.message));
    }
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
