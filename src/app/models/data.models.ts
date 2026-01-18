export interface FactRevenue {
  Date: any; // يمكن تحويلها لـ Date object لاحقاً
  Year: number;
  Month: number;
  Product_ID: number;
  Client_ID: number;
  Country: string;
  Type: string;
  Status: string;
  Gross: number;
}

export interface FactPipeline {
  Product_ID: number;
  Client_ID: number;
  Target_Amount: number;
  Quarter: number;
  Year: number;
  Status: string;
}

export interface DimProduct {
  Product_ID: number;
  Product_Name: string;
  Category: string;
}

export interface DimClient {
  Client_ID: number;
  Client_Name: string;
  Country: string;
}
export interface FactTarget {
  Product_ID: number;
  Country: string;
  Year: number;
  Target_Amount: number;
}

export interface FactCost {
  Date: string; // يفضل توحيد صيغة التاريخ
  Year: number;
  Month: number;
  Monthly_Cost: number;
}
