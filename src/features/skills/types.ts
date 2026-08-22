export interface SkillEntry {
  category: string; // e.g., Hardware, Networking, Graphic Design, Video Editing
  level: number; // 1 to 5
}

export interface Skill {
  id: number;
  name: string;
  myanmarName: string;
}

export interface EmployeeSkillLevel {
  skillId: number;
  level: 1 | 2 | 3 | 4 | 0; // 0 for no level yet
}

export interface Employee {
  id: string;
  name: string;
  skills: EmployeeSkillLevel[];
}

export interface EmployeeProfile {
  id: string; // userId
  name: string;
  department: "IT" | "Merchandising" | "Digital Marketing" | "Management";
  skills: SkillEntry[];
}
