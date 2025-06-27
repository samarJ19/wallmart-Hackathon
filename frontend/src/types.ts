export interface Product{
  id:string
  name:string,
  description:string,
  price: number,
  category:string,
  brand:string,
  imageUrl:string,
  images:string[],
  features:JSON,
  inventory:number,
  isActive:boolean,
  has3DModel:boolean,
  arEnabled:boolean,
}
