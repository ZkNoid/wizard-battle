import { IPublicState } from '../../../../common/types/matchmaking.types';
import {
  IUserActions,
  ITrustedState,
} from '../../../../common/types/gameplay.types';

export interface IBotStrategy {
  generateSetup(botId: string, socketId: string): IPublicState;

  generateActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserActions;

  generateTrustedState(
    botId: string,
    currentState: IPublicState,
    allActions: { [playerId: string]: IUserActions },
    opponentPublicState?: IPublicState
  ): ITrustedState;
}
