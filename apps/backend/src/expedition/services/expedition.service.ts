import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expedition, ExpeditionDocument } from '../schemas/expedition.schema';
import { Location, LocationDocument } from '../schemas/location.schema';
import { CreateExpeditionDto } from '../dto/create-expedition.dto';
import { UpdateExpeditionDto } from '../dto/update-expedition.dto';
import { UserInventoryService } from '../../user-inventory/services/user-inventory.service';
import type {
  ExpeditionTimePeriod,
  IExpeditionRewardDB,
} from '@wizard-battle/common';

@Injectable()
export class ExpeditionService {
  constructor(
    @InjectModel(Expedition.name)
    private readonly expeditionModel: Model<ExpeditionDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    private readonly userInventoryService: UserInventoryService
  ) {}

  /**
   * Convert time period (hours) to milliseconds
   */
  private timePeriodToMs(timePeriod: ExpeditionTimePeriod): number {
    return timePeriod * 60 * 60 * 1000;
  }

  /**
   * Generate a unique expedition ID
   */
  private generateExpeditionId(): string {
    return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate random rewards from location's possible rewards
   */
  private generateRewards(
    possibleRewards: IExpeditionRewardDB[],
    minRewards: number,
    maxRewards: number
  ): IExpeditionRewardDB[] {
    const numRewards =
      Math.floor(Math.random() * (maxRewards - minRewards + 1)) + minRewards;
    const shuffled = [...possibleRewards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numRewards).map((r) => ({
      itemId: r.itemId,
      amount: Math.floor(Math.random() * 10) + 1, // Random amount 1-10
    }));
  }

  /**
   * Create a new expedition
   */
  async createExpedition(dto: CreateExpeditionDto): Promise<Expedition> {
    // Get location data
    const location = await this.locationModel.findOne({ id: dto.locationId });
    if (!location) {
      throw new NotFoundException(
        `Location with id "${dto.locationId}" not found`
      );
    }

    const timeToComplete = this.timePeriodToMs(dto.timePeriod);
    const now = new Date();

    const newExpedition = new this.expeditionModel({
      id: this.generateExpeditionId(),
      userId: dto.userId,
      characterId: dto.characterId,
      characterRole: dto.characterRole,
      characterImage: dto.characterImage,
      locationId: dto.locationId,
      locationName: location.name,
      rewards: this.generateRewards(
        location.possibleRewards,
        location.minRewards,
        location.maxRewards
      ),
      status: 'active',
      startedAt: now,
      completesAt: new Date(now.getTime() + timeToComplete),
      timeToComplete,
    });

    return newExpedition.save();
  }

  /**
   * Get all expeditions for a user
   */
  async getUserExpeditions(userId: string): Promise<Expedition[]> {
    return this.expeditionModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get active expeditions for a user
   */
  async getActiveExpeditions(userId: string): Promise<Expedition[]> {
    return this.expeditionModel
      .find({ userId, status: 'active' })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get a single expedition by id
   */
  async getExpeditionById(id: string): Promise<Expedition> {
    const expedition = await this.expeditionModel.findOne({ id }).exec();
    if (!expedition) {
      throw new NotFoundException(`Expedition with id "${id}" not found`);
    }
    return expedition;
  }

  /**
   * Get a single expedition by id for a specific user
   */
  async getUserExpedition(
    userId: string,
    expeditionId: string
  ): Promise<Expedition> {
    const expedition = await this.expeditionModel
      .findOne({ id: expeditionId, userId })
      .exec();
    if (!expedition) {
      throw new NotFoundException(
        `Expedition with id "${expeditionId}" not found`
      );
    }
    return expedition;
  }

  /**
   * Update an expedition's status
   */
  async updateExpedition(
    userId: string,
    expeditionId: string,
    updateDto: UpdateExpeditionDto
  ): Promise<Expedition> {
    const expedition = await this.expeditionModel
      .findOneAndUpdate(
        { id: expeditionId, userId },
        { ...updateDto, updatedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!expedition) {
      throw new NotFoundException(
        `Expedition with id "${expeditionId}" not found`
      );
    }

    return expedition;
  }

  /**
   * Complete an expedition and add rewards to user inventory
   */
  async completeExpedition(
    userId: string,
    expeditionId: string
  ): Promise<Expedition> {
    const expedition = await this.getUserExpedition(userId, expeditionId);

    if (expedition.status === 'completed') {
      throw new BadRequestException('Expedition already completed');
    }

    // Add rewards to user inventory
    for (const reward of expedition.rewards) {
      await this.userInventoryService.addItem({
        userId,
        itemId: reward.itemId,
        quantity: reward.amount,
        acquiredFrom: 'reward',
      });
    }

    // Update expedition status
    return this.updateExpedition(userId, expeditionId, { status: 'completed' });
  }

  /**
   * Interrupt an expedition and add partial rewards
   */
  async interruptExpedition(
    userId: string,
    expeditionId: string
  ): Promise<Expedition> {
    const expedition = await this.getUserExpedition(userId, expeditionId);

    if (expedition.status !== 'active') {
      throw new BadRequestException('Can only interrupt active expeditions');
    }

    // Calculate progress
    const now = new Date();
    const startedAt = expedition.startedAt ?? expedition.createdAt;
    const elapsed = now.getTime() - new Date(startedAt).getTime();
    const progress = Math.min(elapsed / expedition.timeToComplete, 1);

    // Calculate partial rewards (50% of what would have been earned based on progress)
    const partialRewards = expedition.rewards.map((r) => ({
      itemId: r.itemId,
      amount: Math.max(1, Math.floor(r.amount * progress * 0.5)),
    }));

    // Add partial rewards to user inventory
    for (const reward of partialRewards) {
      await this.userInventoryService.addItem({
        userId,
        itemId: reward.itemId,
        quantity: reward.amount,
        acquiredFrom: 'reward',
      });
    }

    // Update expedition with partial rewards and completed status
    const updated = await this.expeditionModel
      .findOneAndUpdate(
        { id: expeditionId, userId },
        {
          status: 'completed',
          rewards: partialRewards,
          updatedAt: now,
        },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(
        `Expedition with id "${expeditionId}" not found`
      );
    }

    return updated;
  }

  /**
   * Delete an expedition
   */
  async deleteExpedition(userId: string, expeditionId: string): Promise<void> {
    const result = await this.expeditionModel
      .deleteOne({ id: expeditionId, userId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Expedition with id "${expeditionId}" not found`
      );
    }
  }

  /**
   * Get expedition count for a user
   */
  async getExpeditionCount(userId: string): Promise<number> {
    return this.expeditionModel.countDocuments({ userId }).exec();
  }

  /**
   * Get active expedition count for a user
   */
  async getActiveExpeditionCount(userId: string): Promise<number> {
    return this.expeditionModel
      .countDocuments({ userId, status: 'active' })
      .exec();
  }
}
