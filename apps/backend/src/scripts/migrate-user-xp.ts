import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../user/user.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schemas/user.schema';

/**
 * Migration script to add XP fields to existing users
 * Run this once with: npx ts-node src/scripts/migrate-user-xp.ts
 */
async function migrate() {
  console.log('Starting migration...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  // Get the user model directly
  const userModel = app.get<Model<UserDocument>>('UserModel');

  try {
    // Update all users that don't have the new XP fields
    const result = await userModel.updateMany(
      {
        $or: [
          { mage_xp: { $exists: false } },
          { archer_xp: { $exists: false } },
          { duelist_xp: { $exists: false } },
        ],
      },
      {
        $set: {
          mage_xp: 0,
          archer_xp: 0,
          duelist_xp: 0,
        },
      }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`   Updated ${result.modifiedCount} user(s)`);
    console.log(`   Matched ${result.matchedCount} user(s)`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await app.close();
  }
}

migrate();
