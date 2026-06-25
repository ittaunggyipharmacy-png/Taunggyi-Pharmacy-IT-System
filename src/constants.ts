import { KPI, Skill } from "./types";

export const INITIAL_KPIS: KPI[] = [
 { id: "1", role: "IT Supervisor", title: "Hardware & Software Maintenance", scoreType: "Higher is Better", unit: "maintenance tasks", target: 0, actual: 0, weight: 25.00 },
 { id: "2", role: "IT Supervisor", title: "User Support Response Time", scoreType: "Higher is Better", unit: "support tickets", target: 0, actual: 0, weight: 25.00 },
 { id: "3", role: "IT Supervisor", title: "Data Backup & Security Control", scoreType: "Higher is Better", unit: "backup/security checks", target: 0, actual: 0, weight: 25.00 },
 { id: "4", role: "IT Supervisor", title: "System Access Control", scoreType: "Higher is Better", unit: "access records", target: 0, actual: 0, weight: 25.00 },
 { id: "5", role: "Merchandising Supervisor", title: "Product Display Effectiveness", scoreType: "Higher is Better", unit: "display checks", target: 0, actual: 0, weight: 33.33 },
 { id: "6", role: "Merchandising Supervisor", title: "Promotion Display Compliance", scoreType: "Higher is Better", unit: "promotion checks", target: 0, actual: 0, weight: 33.33 },
 { id: "7", role: "Merchandising Supervisor", title: "Display Cleanliness & Standard Control", scoreType: "Higher is Better", unit: "standard checks", target: 0, actual: 0, weight: 33.33 },
 { id: "8", role: "IT Digital Marketing", title: "Digital Content Posting Timeliness", scoreType: "Higher is Better", unit: "posts", target: 0, actual: 0, weight: 25.00 },
 { id: "9", role: "IT Digital Marketing", title: "Graphic & Digital Material Preparation", scoreType: "Higher is Better", unit: "materials", target: 0, actual: 0, weight: 25.00 },
 { id: "10", role: "IT Digital Marketing", title: "Page Performance Monitoring", scoreType: "Higher is Better", unit: "reports", target: 0, actual: 0, weight: 25.00 },
 { id: "11", role: "IT Digital Marketing", title: "IT & Digital Platform Support", scoreType: "Higher is Better", unit: "support tasks", target: 0, actual: 0, weight: 25.00 },
];

export const SKILL_CATEGORIES = {
 "IT & Network": [1, 8, 9, 10, 11],
 "Creative & Marketing": [2, 3, 4, 5, 6, 7],
 "Soft Skills": [12, 13, 14, 15, 16, 17, 18]
};

export const SKILLS: Skill[] = [
 { id: 1, name: "Computer Basic Knowledge", myanmarName: "ကွန်ပျူတာအခြေခံဗဟုသုတ" },
 { id: 2, name: "Social Media Management", myanmarName: "ဆိုရှယ်မီဒီယာ စီမံခန့်ခွဲမှု" },
 { id: 3, name: "Content Creation", myanmarName: "အကြောင်းအရာဖန်တီးနိုင်စွမ်းရှိမှု" },
 { id: 4, name: "Graphic Design Basic", myanmarName: "ဒီဇိုင်း အခြေခံ" },
 { id: 5, name: "Adobe Creative Suite (Ps, Ai)", myanmarName: "Adobe ဆော့ဖ်ဝဲလ်များ ကျွမ်းကျင်မှု" },
 { id: 6, name: "Video editing (Video Basic)", myanmarName: "Video အခြေခံ" },
 { id: 7, name: "Adobe Premiere Pro / After Effects", myanmarName: "ပရော်ဖက်ရှင်နယ် တည်းဖြတ်ဆော့ဖ်ဝဲလ်များ" },
 { id: 8, name: "Network Basics (Wi-Fi/LAN)", myanmarName: "အခြေခံ ကွန်ရက် ချိတ်ဆက်မှုများ" },
 { id: 9, name: "Computer troubleshooting", myanmarName: "ကွန်ပျူတာ ပြဿနာ ရှာဖွေဖြေရှင်းခြင်း" },
 { id: 10, name: "Hardware Troubleshooting", myanmarName: "စက်ပစ္စည်းပိုင်းဆိုင်ရာ ပြဿနာ ရှာဖွေဖြေရှင်းခြင်း" },
 { id: 11, name: "Software installation", myanmarName: "Software သွင်းခြင်း" },
 { id: 12, name: "Teamwork", myanmarName: "အသင်းအဖွဲ့နှင့် ပူးပေါင်းဆောင်ရွက်မှု" },
 { id: 13, name: "Communication Skill", myanmarName: "ဆက်သွယ်ပြောဆိုနိုင်မှု" },
 { id: 14, name: "Problem Solving", myanmarName: "ပြဿနာဖြေရှင်းနိုင်စွမ်း" },
 { id: 15, name: "Time Management", myanmarName: "အချိန်ကို စီမံခန့်ခွဲနိုင်မှု" },
 { id: 16, name: "Space Planning", myanmarName: "ဆိုင်နေရာ အသုံးချမှု စီမံချက်" },
 { id: 17, name: "Negotiation Skills", myanmarName: "ညှိနှိုင်း ဆွေးနွေးနိုင်စွမ်း" },
 { id: 18, name: "Data Reporting", myanmarName: "အချက်အလက် အစီရင်ခံစာ ရေးသားခြင်း" },
];
