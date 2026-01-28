import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expedition, ExpeditionDocument } from '../schemas/expedition.schema';
import { ExpeditionDto } from '../dto/expedition.dto';
import { UserInventoryService } from '../../user-inventory/services/user-inventory.service';
import { AcquiredFrom } from '../../user-inventory/dto/add-item-to-inventory.dto';

// Location-based loot tables
const LOCATION_LOOT_TABLES: Record<
  number,
  Array<{ itemId: string; weight: number }>
> = {
  1: [
    // Serpentwater Basin
    { itemId: '1', weight: 30 }, // Common water items
    { itemId: '2', weight: 25 },
    { itemId: '3', weight: 20 },
    { itemId: '4', weight: 15 },
    { itemId: '5', weight: 10 },
  ],
  2: [
    // Mount Avalon
    { itemId: '6', weight: 30 },
    { itemId: '7', weight: 25 },
    { itemId: '8', weight: 20 },
    { itemId: '9', weight: 15 },
    { itemId: '10', weight: 10 },
  ],
  3: [
    // Whisperwood Grove
    { itemId: '11', weight: 30 },
    { itemId: '12', weight: 25 },
    { itemId: '13', weight: 20 },
    { itemId: '14', weight: 15 },
    { itemId: '15', weight: 10 },
  ],
  4: [
    // Blackfin Hollow
    { itemId: '16', weight: 30 },
    { itemId: '17', weight: 25 },
    { itemId: '18', weight: 20 },
    { itemId: '19', weight: 15 },
    { itemId: '20', weight: 10 },
  ],
};

@Injectable()
export class ExpeditionService {
  constructor(
    @InjectModel(Expedition.name)
    private readonly expeditionModel: Model<ExpeditionDocument>,
    private readonly inventoryService: UserInventoryService
  ) {}

  /**
   * Generate random loot based on location
   */
  private generateLoot(
    locationId: number
  ): Array<{ itemId: string; amount: number }> {
    const lootTable = LOCATION_LOOT_TABLES[locationId];
    if (!lootTable) {
      throw new BadRequestException(`Invalid location ID: ${locationId}`);
    }

    const rewards: Array<{ itemId: string; amount: number }> = [];
    const numRewards = Math.floor(Math.random() * 3) + 3; // 3-5 items

    for (let i = 0; i < numRewards; i++) {
      const totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;

      for (const item of lootTable) {
        random -= item.weight;
        if (random <= 0) {
          const amount = Math.floor(Math.random() * 10) + 1; // 1-10 items
          rewards.push({ itemId: item.itemId, amount });
          break;
        }
      }
    }

    return rewards;
  }

  /**
   * Launch a new expedition
   * POST /expedition/launch
   */
  async launchExpedition(dto: ExpeditionDto): Promise<Expedition> {
    // Check if user already has an active expedition with this character
    const activeExpedition = await this.expeditionModel.findOne({
      userId: dto.userId,
      characterId: dto.characterId,
      status: 'active',
    });

    if (activeExpedition) {
      throw new ConflictException(
        `Character ${dto.characterId} is already on an expedition`
      );
    }

    // Generate random location (1-4)
    const locationId = Math.floor(Math.random() * 4) + 1;

    // Generate loot for this expedition
    const rewards = this.generateLoot(locationId);

    // Static time to complete: 1 hour (in milliseconds)
    const timeToComplete = 3600000;

    // Create new expedition
    const expedition = new this.expeditionModel({
      userId: dto.userId,
      characterId: dto.characterId,
      locationId,
      status: 'active',
      rewards,
      startedAt: new Date(),
      timeToComplete,
    });

    return expedition.save();
  }

  /**
   * Complete an expedition and add loot to user inventory
   * POST /expedition/complete
   */
  async completeExpedition(dto: ExpeditionDto): Promise<{
    expedition: Expedition;
    addedItems: Array<{ itemId: string; amount: number }>;
  }> {
    // Find the expedition
    const expedition = await this.expeditionModel.findOne({
      _id: dto.expeditionId,
      userId: dto.userId,
    });

    if (!expedition) {
      throw new NotFoundException(
        `Expedition ${dto.expeditionId} not found for user ${dto.userId}`
      );
    }

    if (expedition.status !== 'active') {
      throw new BadRequestException(
        `Expedition ${dto.expeditionId} is not active`
      );
    }

    // Check if expedition time has elapsed
    const now = new Date();
    const expeditionEndTime = new Date(
      expedition.startedAt.getTime() + expedition.timeToComplete
    );

    if (now < expeditionEndTime) {
      const remainingTime = expeditionEndTime.getTime() - now.getTime();
      throw new BadRequestException(
        `Expedition is not complete yet. Remaining time: ${Math.ceil(remainingTime / 1000)} seconds`
      );
    }

    // Add rewards to user inventory
    const addedItems: Array<{ itemId: string; amount: number }> = [];
    for (const reward of expedition.rewards) {
      await this.inventoryService.addItem({
        userId: dto.userId,
        itemId: reward.itemId,
        quantity: reward.amount,
        acquiredFrom: AcquiredFrom.REWARD,
      });
      addedItems.push({ itemId: reward.itemId, amount: reward.amount });
    }

    // Update expedition status
    expedition.status = 'completed';
    expedition.completedAt = now;
    await expedition.save();

    return {
      expedition,
      addedItems,
    };
  }

  /**
   * Get user's active expeditions
   */
  async getUserActiveExpeditions(userId: string): Promise<Expedition[]> {
    return this.expeditionModel.find({ userId, status: 'active' }).exec();
  }

  /**
   * Get user's expedition history
   */
  async getUserExpeditionHistory(userId: string): Promise<Expedition[]> {
    return this.expeditionModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Cancel an active expedition (optional)
   */
  async cancelExpedition(
    userId: string,
    expeditionId: string
  ): Promise<Expedition> {
    const expedition = await this.expeditionModel.findOne({
      _id: expeditionId,
      userId,
      status: 'active',
    });

    if (!expedition) {
      throw new NotFoundException(
        `Active expedition ${expeditionId} not found`
      );
    }

    expedition.status = 'completed';
    expedition.completedAt = new Date();
    // Clear rewards since it was cancelled
    expedition.rewards = [];

    return expedition.save();
  }
}
