export interface KPIModule {
  id: string;
  label: string;
  tasks: KPITask[];
}

export interface KPITask {
  id: string;
  text: string;
  completed: boolean;
}

export interface KPI {
  id: string;
  role: string;
  title: string;
  scoreType: "Higher is Better";
  unit: string;
  weight: number; // as percentage, e.g., 25.00
  target: number;
  actual: number;
}
