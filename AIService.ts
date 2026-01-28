
import { GoogleGenAI } from "@google/genai";
import { PropertyFile, User, Transaction } from "./types";

/**
 * Initializes the AI client using the environment key.
 * Strictly adheres to the requirement of using process.env.API_KEY.
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an institutional summary of a user's portfolio.
 */
export const generateSmartSummary = async (user: User, files: PropertyFile[]) => {
  const ai = getAI();
  
  const context = files.map(f => ({
    id: f.fileNo,
    owner: f.ownerName,
    size: f.plotSize,
    totalVal: f.plotValue,
    paid: f.paymentReceived,
    balance: f.balance,
    overdue: f.overdue
  }));

  const prompt = `
    Analyze this real estate portfolio for ${user.name} (${user.role}).
    REGISTRY DATA: ${JSON.stringify(context)}
    
    TASK: Provide a 3-sentence high-level executive summary. 
    Focus on financial health, upcoming milestones, and collection status.
    STRICT RULE: NO BOLDING, NO STARS, NO MARKDOWN STYLING.
    Tone: Senior Financial Auditor.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    console.error("AI Summary Error:", error);
    return "Analysis suspended. Registry synchronization required.";
  }
};

/**
 * Generates a refined WhatsApp message based on file data.
 */
export const generateWhatsAppRecoveryMessage = async (file: PropertyFile) => {
  const ai = getAI();
  const nextPayment = file.transactions.find(t => (t.balduedeb || 0) > 0);
  
  const prompt = `
    Create a professional, firm but respectful WhatsApp payment recovery reminder for a high-end real estate client.
    OWNER: ${file.ownerName}
    FILE: ${file.fileNo}
    BALANCE: ${file.balance} PKR
    DUE DATE: ${nextPayment?.duedate || 'N/A'}
    
    STRICT FORMAT: 
    Start with "Salam [Name],"
    End with "Regards, DIN Properties Management."
    MAX 40 words. No emojis except one 🏢 at the end. No bolding.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    return `Salam ${file.ownerName}, this is DIN Properties. Your file ${file.fileNo} has an outstanding balance of ${file.balance} PKR. Please settle this to avoid surcharges. Regards, Management.`;
  }
};

/**
 * Streams chat responses with role-based system instructions.
 */
export async function* streamChatResponse(message: string, role: string, contextData: any[]) {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `
        You are the DIN Properties Secure Registry Assistant.
        CURRENT USER ROLE: ${role}

        IF ROLE IS ADMIN:
        - You are the Global Portfolio Supervisor.
        - You have full access to ALL property files and transactions.
        - You can perform global audits, identify collection trends, and list defaults across all clients.
        - Always include Owner Names in your tables.

        IF ROLE IS CLIENT:
        - You are a Private Ledger Auditor.
        - You only see the user's personal property files.
        - Focus on explaining installments, upcoming due dates, and payment history.

        STRICT FORMATTING:
        1. Use ALL CAPS for headers.
        2. NO STARS (**) or BOLDING.
        3. Use Markdown Tables for financial data.
        4. Columns for Admin: | OWNER | FILE ID | SIZE | DUE DATE | OVERDUE (PKR) |
        5. Columns for Client: | DESCRIPTION | DUE DATE | PAYABLE (PKR) | PAID (PKR) | BALANCE (PKR) |

        DATA CONTEXT: ${JSON.stringify(contextData)}
      `,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
      // Use cast to any to safely access the .text property of GenerateContentResponse
      const c = chunk as any;
      yield c.text;
    }
  } catch (error) {
    console.error("Streaming Error:", error);
    throw error;
  }
}
