export interface IUser {
  address: string;
  name?: string;
  xp: number;
  archer_xp: number;
  duelist_xp: number;
  mage_xp: number;
  createdAt: string;
  updatedAt: string | { $date: string };
}
