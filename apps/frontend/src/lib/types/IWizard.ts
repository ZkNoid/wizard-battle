export interface IWizard {
  id: string;
  imageURL: string;
  skills: ISkill[];
}

export interface ISkill {
  id: string;
  description: string;
  imageURL: string;
}
