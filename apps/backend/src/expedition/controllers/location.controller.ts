import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocationService } from '../services/location.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { Location } from '../schemas/location.schema';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Create a new location
   * POST /locations
   */
  @Post()
  createLocation(@Body() dto: CreateLocationDto): Promise<Location> {
    return this.locationService.createLocation(dto);
  }

  /**
   * Get all locations
   * GET /locations
   */
  @Get()
  getAllLocations(): Promise<Location[]> {
    return this.locationService.getAllLocations();
  }

  /**
   * Get location count
   * GET /locations/count
   */
  @Get('count')
  getLocationCount(): Promise<{ count: number }> {
    return this.locationService.getLocationCount().then((count) => ({ count }));
  }

  /**
   * Get a specific location
   * GET /locations/:id
   */
  @Get(':id')
  getLocation(@Param('id') id: string): Promise<Location> {
    return this.locationService.getLocationById(id);
  }

  /**
   * Update a location
   * PATCH /locations/:id
   */
  @Patch(':id')
  updateLocation(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateLocationDto>,
  ): Promise<Location> {
    return this.locationService.updateLocation(id, updateData);
  }

  /**
   * Delete a location
   * DELETE /locations/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLocation(@Param('id') id: string): Promise<void> {
    return this.locationService.deleteLocation(id);
  }
}

