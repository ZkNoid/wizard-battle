import { Injectable } from '@nestjs/common';

@Injectable()
export class GameCommitService {
  // Generic handler or specific logic per resource type

  commitResource(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing resource [${name}] - action: ${action}`, payload);
    // Implement your game logic here
    return { success: true, resource: name, action, payload };
  }

  commitCoin(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing coin [${name}] - action: ${action}`, payload);
    return { success: true, coin: name, action, payload };
  }

  commitItem(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing item [${name}] - action: ${action}`, payload);
    return { success: true, item: name, action, payload };
  }

  commitCharacter(name: string, action: 'mint' | 'burn' | 'modify', payload: any) {
    console.log(`Committing character [${name}] - action: ${action}`, payload);
    return { success: true, character: name, action, payload };
  }
}