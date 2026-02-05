export interface ITestnetBlock {
  title: string;
  points: number;
  items: ITestnetTask[];
}

export interface ITestnetTask {
  isCompleted: boolean;
  title: string;
}

export interface ITestnetLeaderboardItem {
  address: string;
  place: number;
  points: number;
}
