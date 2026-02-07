import type { ITestnetBlock, ITestnetLeaderboardItem } from '../types/ITestnet';

export const TESTNET_BLOCKS: ITestnetBlock[] = [
  {
    title: 'Tier 1: Meet the game',
    points: 5,
    items: [
      { isCompleted: true, title: 'Connect Wallet' },
      { isCompleted: false, title: 'Complete 1 PvE duel' },
      { isCompleted: true, title: 'Complete 1 PvP duel' },
      { isCompleted: true, title: 'Embark on an expedition' },
      { isCompleted: false, title: 'Save your custom map' },
    ],
  },
  {
    title: 'Tier 2: First steps',
    points: 10,
    items: [
      { isCompleted: true, title: 'Win 1 PvE battle' },
      { isCompleted: true, title: 'Win 1 PvP battle' },
      { isCompleted: true, title: 'Win with <20% HP remaining' },
      { isCompleted: true, title: 'Level up 1 wizard' },
      { isCompleted: true, title: 'Craft and equip 1 peace of gear' },
    ],
  },
  {
    title: 'Tier 3: Early wizard',
    points: 15,
    items: [
      { isCompleted: false, title: 'Play 10 total battles' },
      { isCompleted: false, title: 'Win 3 PvE battle' },
      { isCompleted: false, title: 'Win 3 PvP battle' },
      { isCompleted: false, title: 'Reach LvL 10 with any wizard' },
      { isCompleted: false, title: 'Craft and equip 1 peace of gear' },
    ],
  },
  {
    title: 'Tier 4: Experienced wizard',
    points: 20,
    items: [
      { isCompleted: false, title: 'Play 20 rounds in any match' },
      { isCompleted: false, title: 'Win 10 duels' },
      { isCompleted: false, title: 'Have a fully geared wizard' },
      { isCompleted: false, title: 'Upgrade any gear' },
      { isCompleted: false, title: 'Win a battle with full HP' },
    ],
  },
  {
    title: 'Tier 5: Experienced wizard',
    points: 25,
    items: [
      { isCompleted: false, title: 'Reach LvL 20 with any wizard' },
      { isCompleted: false, title: 'Win 10 PvE battles' },
      { isCompleted: false, title: 'Win 10 PvP battles' },
      { isCompleted: false, title: 'Have a full set of lvl 2 gear' },
    ],
  },
  {
    title: 'Tier 6: Leave feedback',
    points: 10,
    items: [{ isCompleted: false, title: 'Win a battle with full HP' }],
  },
];

export const TESTNET_LEADERBOARD: ITestnetLeaderboardItem[] = [
  {
    place: 1,
    walletAddress: 'B62qkYa1o6Mj6uTTjDQCob7FYZspuhkm4RRQhgJg9j4koEBWiSrTQrS',
    points: 285,
  },
  {
    place: 2,
    walletAddress: 'B62qnzbXmRNo9q32n4SNu2mpB8e7FYYLH8NmaX6oFCBYjjQ8SbD7uzV',
    points: 270,
  },
  {
    place: 3,
    walletAddress: 'B62qre3erTHfzQckNuibViWQGyyKwZseztqrjPZBv6SQF384Rg6ESAy',
    points: 255,
  },
  {
    place: 4,
    walletAddress: 'B62qrQiw9JhUumq457sMxicgQ94Z1WD9JChzJu1zRcGoPxkVc8s6nLw',
    points: 240,
  },
  {
    place: 5,
    walletAddress: 'B62qpBrUYW8SHq8bRFXLH8v3K6ftyKwvz1HqNQRnvTGQMUUV8UDMy5m',
    points: 225,
  },
  {
    place: 6,
    walletAddress: 'B62qoG5Yk4iVxpyczUrBNpwtx2xunhL48dydN53A2VjoRwF8NUTbVr4',
    points: 210,
  },
  {
    place: 7,
    walletAddress: 'B62qnDPkrmq2KHVgWvJRKCPXKjLXfVRUJCdHjqRQDHFG4X3A9L7V9qS',
    points: 195,
  },
  {
    place: 8,
    walletAddress: 'B62qmQsEqCXVdGJe8XbqXxGJKxw7BYqVmXQUXGLZvHiAz9Q8RnWH2Ks',
    points: 180,
  },
  {
    place: 9,
    walletAddress: 'B62qkfHpLpELqpMK6ZvUTJ5wRqKDRcKzqqW5RrcoPvvAJMaPYRALoSa',
    points: 165,
  },
  {
    place: 10,
    walletAddress: 'B62qpkCEM5N8xNnRKKCB6dYs4V1V65mf8t4kXmFjmUWLzRx3Lzw8Ty1',
    points: 150,
  },
  {
    place: 11,
    walletAddress: 'B62qjYanmV7y9njVeH5UHkz3GYBm7xKir1rAnoY4KsEYUGLMiU45FSM',
    points: 135,
  },
  {
    place: 12,
    walletAddress: 'B62qoqiAgERjCjXhofXiD7cMLJSKD8hE8ZtMh4jX5MPNgKB4CFxxm1N',
    points: 120,
  },
  {
    place: 13,
    walletAddress: 'B62qrPN5Y5yq8kGE3FbVKbGTdTAJNdtNtB5sNVpxyQwWYZUHmPpvbvV',
    points: 105,
  },
  {
    place: 14,
    walletAddress: 'B62qkUXyy5nKGJXFnXCqRFGLZvf4rxuFJfvxQ3T7gFrVNJnBWXkqBvJ',
    points: 90,
  },
  {
    place: 15,
    walletAddress: 'B62qpLST8CqxHMHRjXGqKjG7m9YCFS4RDnZqkVXaFJ8xwVt7xYLQ6FX',
    points: 75,
  },
  {
    place: 16,
    walletAddress: 'B62qqGXbmXCGT8kfE7pMHKAZnBG9YWx7Sj4nQNvDLz8xRJTWu5qQkpP',
    points: 60,
  },
  {
    place: 17,
    walletAddress: 'B62qnw7TvD8uJvHZ6ZP5gQqWNfqkXxRV7K3Fj9VXnMb2Lw4sYJRqCvX',
    points: 45,
  },
  {
    place: 18,
    walletAddress: 'B62qmFSNvDHnKyRtJJQXZgJnvM8p2eRfKx7LvT6WqBs9NJYQmXpLkRt',
    points: 30,
  },
  {
    place: 19,
    walletAddress: 'B62qkAJ8XZGqPYN5VWRtMnC7Q3KfLx9vP2DhJ8FmYqXsW4NzRvLpQx1',
    points: 15,
  },
  {
    place: 20,
    walletAddress: 'B62qpWx7vKfDRnP9LjQmT5BsXzY6N3HJv8GqKw2CfZRtVuM4pYLsSNw',
    points: 10,
  },
];

export const TESTNET_CURRENT_USER: ITestnetLeaderboardItem = {
  place: 322,
  walletAddress: 'B62qkYa1o6Mj6uTTjDQCob7FYZspuhkm4RRQhgJg9j4koEBWiSrTQrS',
  points: 112,
};
