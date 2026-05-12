import { GoogleGenAI, Type } from "@google/genai";
import { auth } from "./firebase";
import { saveAsset, saveDailyLog } from "./firestoreService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const IT_SYSTEM_PROMPT = `
Role: You are the "Proactive IT Asset Auditor" for Taunggyi Pharmacy. Your goal is to manage assets, track KPIs, and organize file storage with 100% accuracy and proactivity.

YOUR MANDATE:
1. Whenever a user provides an asset list or mentions an asset with missing details (Specs or Price), do NOT ask for permission to search.
2. IMMEDIATELY trigger 'perform_web_search' for every item that lacks data.
3. Once found, compare all assets. Ranking criteria: High RAM > New Generation CPU > SSD.
4. After completing the search and comparison, present the final updated table and ask ONLY ONE QUESTION: "I have found the missing specs and ranked your assets. Should I save these to Firestore now?"

STRICT RULE: No "Why?" or "Would you like me to...?" questions for searching. Just do it.

1. DATA GROUNDING & KNOWLEDGE:
- You have direct access to the Firestore Database (Assets, KPI Logs, Daily Tasks) and Google Drive Storage.
- NEVER hallucinate numbers. If data is missing (e.g., a computer's price or RAM), state clearly that it is missing.
- Use the provided context (JSON/Variables) as your only Source of Truth for internal records.

2. KPI & TEAM MONITORING:
- IT Supervisor: Monitor system uptime, maintenance logs, and asset health.
- Merchandising: Track store visits and display compliance via Photo Evidence and Timestamps.
- Digital Marketing: 
    * Daily: Track 20 Product Photos (Viber). 
    * Weekly: 2x TikTok (Normal), 1x TikTok (Medical - Wed), Saturday Weekend Post.
- Verification: Use Uploaded Photos and Timestamps to verify work. No GPS required.

4. AUTOMATED FILE STORAGE LOGIC:
- Organize all uploads into Google Drive: Taunggyi_Assets/[Category]/[Current_Date].
- Categories: "TikTok_Videos" (.mp4, .mov), "Photoshop_Files" (.psd), "Viber_Photos" (.jpg, .png).
- If the date folder doesn't exist, you must trigger the function to create it.

5. COMMUNICATION STYLE:
- Professional, technical, and bilingual (Burmese & English).
- Use Tables and Charts (via Tool outputs) for reporting.
- Proactive Engagement: If you see a KPI is missed or an asset is failing, notify the Supervisor immediately.

6. FUNCTION CALLING PROTOCOL:
- Use 'fetch_database()' for all queries.
- Use 'update_database()' when the user confirms a price or a task is done.
- Use 'perform_web_search()' only for external market data gaps.

DATA CONTEXT (Use this as your source of truth):
- Project: Taunggyi Pharmacy IT Group
- Folders: Viber_Photos, TikTok_Videos, Photoshop_Files (Organized by Date)
- Storage: 2TB Total (Google Drive)

## CRITICAL ESCALATION
Always prefix with 🚨 if "Critical Failure", "Security Breach", or "System Down" is mentioned.
`;

export async function chatWithITAssistant(
  message: string, 
  context: { 
    assets: any[], 
    tickets: any[], 
    purchases?: any[], 
    renewals?: any[],
    backups?: any[]
  }, 
  history: { role: "user" | "model"; content: string }[] = []
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Optimized context injection
  const dynamicSystemPrompt = `
${IT_SYSTEM_PROMPT}

## CURRENT SYSTEM DATA (TRUST THIS DATA)
- Total Tickets: ${context.tickets.length}
- Total Purchase Records: ${context.purchases?.length || 0}
- Active Renewals: ${context.renewals?.length || 0}

INSTRUCTION: Use the fetch_database function to query real-time counts about assets! You must call the fetch_database function BEFORE generating an answer about computers or printers or checking for missing info.
`;

  // Convert simple history to parts format for SDK
  const contents = history.map((h: any) => ({
    role: h.role,
    parts: [{ text: h.content }]
  }));

  // Append latest message
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const tools = [
    {
      functionDeclarations: [
        {
          name: "fetch_database",
          description: "Query the Firestore 'assets' collection to get the real-time count of IT assets.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: "Optional. The category to filter by (e.g., 'Computer', 'Printer', 'Network', 'Software', 'Mobile')."
              },
              status: {
                type: Type.STRING,
                description: "Optional. The status to filter by (e.g., 'Active', 'Under Repair', 'Maintenance')."
              }
            }
          }
        },
        {
          name: "update_database",
          description: "Update the price of an asset, or mark a task as done in Firestore.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "The type of update ('asset_price' or 'task_done')."
              },
              id: {
                type: Type.STRING,
                description: "The ID of the asset or task."
              },
              value: {
                type: Type.STRING,
                description: "For asset_price, the new price. For task_done, 'true' or timestamp."
              }
            },
            required: ["type", "id", "value"]
          }
        },
        {
          name: "perform_web_search",
          description: "Perform a Google Search to find external market data or technical specifications.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: "The search query (e.g. 'Dell XPS 13 i7 16GB price in Myanmar')."
              }
            },
            required: ["query"]
          }
        }
      ]
    }
  ] as any;

  const modelName = "gemini-3-flash-preview";
  let response = await ai.models.generateContent({
    model: modelName,
    contents: contents,
    config: {
      systemInstruction: dynamicSystemPrompt,
      tools: tools
    }
  });

  let turns = 0;
  const maxTurns = 10;

  while (response.functionCalls && response.functionCalls.length > 0 && turns < maxTurns) {
    turns++;
    const nextParts: any[] = [];
    
    // Add all current function calls as a model turn
    console.log("DEBUG: Full response:", JSON.stringify(response));
    contents.push({
      role: "model",
      parts: response.functionCalls.map(call => {
        const parts: any[] = [];
        // Include thought as a separate part if available, or a default one as mandatory
        parts.push({ thought: (call as any).thought || "I will process this request." });
        parts.push({ functionCall: { name: call.name, args: call.args } });
        return parts;
      }).flat()
    } as any);

    for (const call of response.functionCalls) {
      if (call.name === "fetch_database") {
        const args = call.args as { category?: string, status?: string };
        
        let filtered = context.assets;
        if (args.category) {
          filtered = filtered.filter(a => a.category?.toLowerCase() === args.category?.toLowerCase());
        }
        if (args.status) {
          filtered = filtered.filter(a => a.status?.toLowerCase() === args.status?.toLowerCase());
        }

        const functionResponseResult = {
          totalFound: filtered.length,
          items: filtered.map(a => ({ 
            id: a.id, 
            model: a.model, 
            brand: a.brand, 
            status: a.status, 
            category: a.category,
            purchasePrice: a.purchasePrice 
          }))
        };

        nextParts.push({ functionResponse: { name: call.name, response: functionResponseResult } });
      } else if (call.name === "update_database") {
        const args = call.args as { type: string, id: string, value: string };
        try {
          if (args.type === "asset_price") {
            await saveAsset({ id: args.id, purchasePrice: args.value });
          } else if (args.type === "task_done") {
            if (auth.currentUser) {
               const dateStr = new Date().toISOString().split('T')[0];
               const logId = `${dateStr}_${auth.currentUser.uid}`;
               await saveDailyLog({
                  id: logId,
                  date: dateStr,
                  userId: auth.currentUser.uid,
                  tasks: { [args.id]: args.value === 'true' ? new Date().toISOString() : args.value }
               });
            }
          }
          nextParts.push({ functionResponse: { name: call.name, response: { success: true, message: `Successfully updated ${args.type} ${args.id}` } } });
        } catch (err: any) {
          nextParts.push({ functionResponse: { name: call.name, response: { success: false, message: `Failed: ${err.message}` } } });
        }
      } else if (call.name === "perform_web_search") {
        const args = call.args as { query: string };
        const mockResult = {
          organic: [
            {
              title: `Market specifications for ${args.query}`,
              snippet: `Specifications for ${args.query}: Often features Intel Core i5/i7, 8GB/16GB RAM, 256GB/512GB SSD. Estimated price: 1,200,000 MMK.`,
              link: "https://example.com/prices"
            }
          ]
        };
        nextParts.push({ functionResponse: { name: call.name, response: mockResult } });
      }
    }

    // Add function responses as a user turn (convention for the SDK)
    contents.push({
      role: "user",
      parts: nextParts
    } as any);

    // Get the next response from the model
    response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: dynamicSystemPrompt,
        tools: tools
      }
    });
  }

  return response.text || "No response received.";
}
