import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from '../schemas/location.schema';
import { CreateLocationDto } from '../dto/create-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
  ) {}

  /**
   * Create a new location
   */
  async createLocation(dto: CreateLocationDto): Promise<Location> {
    // Check if location with same id already exists
    const existing = await this.locationModel.findOne({ id: dto.id });
    if (existing) {
      throw new ConflictException(`Location with id "${dto.id}" already exists`);
    }

    const newLocation = new this.locationModel(dto);
    return newLocation.save();
  }

  /**
   * Get all locations
   */
  async getAllLocations(): Promise<Location[]> {
    return this.locationModel.find().exec();
  }

  /**
   * Get a location by id
   */
  async getLocationById(id: string): Promise<Location> {
    const location = await this.locationModel.findOne({ id }).exec();
    if (!location) {
      throw new NotFoundException(`Location with id "${id}" not found`);
    }
    return location;
  }

  /**
   * Update a location
   */
  async updateLocation(
    id: string,
    updateData: Partial<CreateLocationDto>,
  ): Promise<Location> {
    const location = await this.locationModel
      .findOneAndUpdate({ id }, updateData, { new: true })
      .exec();

    if (!location) {
      throw new NotFoundException(`Location with id "${id}" not found`);
    }

    return location;
  }

  /**
   * Delete a location
   */
  async deleteLocation(id: string): Promise<void> {
    const result = await this.locationModel.deleteOne({ id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Location with id "${id}" not found`);
    }
  }

  /**
   * Get location count
   */
  async getLocationCount(): Promise<number> {
    return this.locationModel.countDocuments().exec();
  }
}

