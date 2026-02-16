import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @Post()
  // async create(@Body() createUserDto: CreateUserDto) {
  //   return this.userService.create(createUserDto);
  // }

  // @Get()
  // async findAll() {
  //   return this.userService.findAll();
  // }

  // @Get(':id')
  // async findById(@Param('id') id: string) {
  //   return this.userService.findById(id);
  // }

  // @Get('address/:address')
  // async findByAddress(@Param('address') address: string) {
  //   return this.userService.findByAddress(address);
  // }

  // @Patch(':id')
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateUserDto: Partial<CreateUserDto>
  // ) {
  //   return this.userService.update(id, updateUserDto);
  // }

  // @Patch('address/:address')
  // async updateByAddress(
  //   @Param('address') address: string,
  //   @Body() updateUserDto: Partial<CreateUserDto>
  // ) {
  //   return this.userService.updateByAddress(address, updateUserDto);
  // }

  // @Delete(':id')
  // async delete(@Param('id') id: string) {
  //   return this.userService.delete(id);
  // }

  // @Post(':address/xp/:amount')
  // async addXP(
  //   @Param('address') address: string,
  //   @Param('amount') amount: string
  // ) {
  //   return this.userService.addXP(address, parseInt(amount, 10));
  // }
}
