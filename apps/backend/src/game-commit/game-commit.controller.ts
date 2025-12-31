import { Controller, Post, Param, Body } from '@nestjs/common';
import { GameCommitService } from './game-commit.service';

@Controller('game-commit')
export class GameCommitController {
  constructor(private readonly gameCommitService: GameCommitService) {}

  // Resources
  @Post('resources/:name/mint')
  mintResource(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitResource(name, 'mint', body);
  }

  @Post('resources/:name/burn')
  burnResource(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitResource(name, 'burn', body);
  }

  @Post('resources/:name/modify')
  modifyResource(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitResource(name, 'modify', body);
  }

  // Coins
  @Post('coins/:name/mint')
  mintCoin(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitCoin(name, 'mint', body);
  }

  @Post('coins/:name/burn')
  burnCoin(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitCoin(name, 'burn', body);
  }

  @Post('coins/:name/modify')
  modifyCoin(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitCoin(name, 'modify', body);
  }

  // Items
  @Post('items/:name/mint')
  mintItem(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitItem(name, 'mint', body);
  }

  @Post('items/:name/burn')
  burnItem(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitItem(name, 'burn', body);
  }

  @Post('items/:name/modify')
  modifyItem(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitItem(name, 'modify', body);
  }

  // Characters
  @Post('characters/:name/mint')
  mintCharacter(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitCharacter(name, 'mint', body);
  }

  @Post('characters/:name/burn')
  burnCharacter(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitCharacter(name, 'burn', body);
  }

  @Post('characters/:name/modify')
  modifyCharacter(@Param('name') name: string, @Body() body: any) {
    return this.gameCommitService.commitCharacter(name, 'modify', body);
  }
}