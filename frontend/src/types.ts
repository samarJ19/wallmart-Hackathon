interface Feature{
      "avg_rating": number,
      "review_count": number,
      "price_competitiveness":number,
      "market_position": string,
      "days_since_launch": number,
      "trend_momentum": number,
      "lifecycle_stage":string
}
export interface Product{
  id:string
  name:string,
  description:string,
  price: number,
  category:string,
  brand:string,
  imageUrl:string,
  images:string[],
  features:Feature,
  inventory:number,
  isActive:boolean,
  has3DModel:boolean,
  arEnabled:boolean,
}

export interface CartItem{
  id:string,
  userId:string,
  productId:string,
  quantity:number,
  product:Product
}