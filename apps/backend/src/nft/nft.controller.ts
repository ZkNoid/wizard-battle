import { Controller, Get, Header, Param } from '@nestjs/common';
import { NftService, Erc1155Metadata } from './nft.service';

/**
 * Serves ERC1155 token metadata consumed by WBResources.uri(tokenId).
 *
 * Contract setup:
 *   await wbResources.setURI('https://yourserver.com/nft/');
 *
 * Then uri(42) resolves to GET https://yourserver.com/nft/42 → this endpoint.
 */
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Get(':tokenId')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  getTokenMetadata(@Param('tokenId') tokenId: string): Promise<Erc1155Metadata> {
    return this.nftService.getMetadata(tokenId);
  }
}
