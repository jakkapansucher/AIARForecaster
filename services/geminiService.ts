
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MonthlyData, ForecastResult } from '../types';

// Note: We do NOT initialize 'ai' globally here. 
// Doing so causes the app to crash immediately on load if the key is missing or invalid.

export const getForecast = async (history: MonthlyData[], segmentName: string = 'Total Portfolio'): Promise<ForecastResult> => {
  
  // 1. Get API Key explicitly from process.env.API_KEY as per Google GenAI Guidelines
  // Note: In a Vite environment, ensure API_KEY is properly exposed via define or environment variables configuration.
  const apiKey = process.env.API_KEY;
  
  // Trim and validate
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("ไม่พบ API Key (process.env.API_KEY) กรุณาตรวจสอบการตั้งค่า Environment Variables");
  }

  // 2. Initialize Client (Lazy Initialization) with Safe Guard
  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } catch (initError: any) {
    console.error("Gemini Client Init Error:", initError);
    throw new Error(`ไม่สามารถเชื่อมต่อกับ Gemini API ได้: ${initError.message}`);
  }

  // 3. Validate Data Integrity
  if (!history || history.length === 0) {
    throw new Error("ไม่พบข้อมูลสำหรับการพยากรณ์");
  }

  // Require at least 6 months of data for a somewhat reliable forecast
  if (history.length < 6) {
    throw new Error(`ข้อมูลไม่เพียงพอ: มีข้อมูลเพียง ${history.length} เดือน (ต้องการอย่างน้อย 6 เดือนเพื่อการพยากรณ์ที่แม่นยำ)`);
  }

  // Use up to 36 months to better detect seasonality (Year-over-Year patterns)
  const recentHistory = history.slice(-36);
  const lastDate = recentHistory.length > 0 ? recentHistory[recentHistory.length - 1].date : 'Unknown';

  // Enhanced Prompt for Pattern Recognition
  const prompt = `
    You are an expert Senior Financial Data Analyst specializing in Accounts Receivable (AR) forecasting.
    
    **Input Data:**
    - Segment: "${segmentName}"
    - Historical Data (Monthly): ${JSON.stringify(recentHistory)}
    
    **Your Task:**
    1. **Analyze Patterns**: Identify specific patterns in the historical data. Look for:
       - **Seasonality**: Are there recurring peaks or drops in specific months? (e.g., Is December always high? Is April low?)
       - **Trend**: Is the overall direction increasing, decreasing, or stable over the last 12 months?
       - **Volatility**: Are there random spikes that should be treated as outliers?
    
    2. **Generate Forecast**: Predict the 'amount' for the NEXT 6 months starting after ${lastDate}.
       - The forecast MUST respect the identified seasonality. (e.g., If history shows Q4 is strong, the forecast for Q4 months should reflect that).
       - Apply the identified trend to the projection.
    
    3. **Explain Reasoning**: Provide a concise explanation citing specific months or trends observed (e.g., "Forecast anticipates a seasonal dip in January based on previous years...").

    **Output Format:**
    Return strictly JSON using the defined schema.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      forecast: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Format YYYY-MM" },
            amount: { type: Type.NUMBER, description: "Forecasted amount" }
          },
          required: ["date", "amount"]
        },
        description: "Array of exactly 6 forecasted months"
      },
      reasoning: {
        type: Type.STRING,
        description: "Strategic explanation of the forecast logic, mentioning seasonality and trend."
      },
      trend: {
        type: Type.STRING,
        description: "Short summary of the trend (e.g., 'Seasonal Uptrend', 'Declining Volatility')."
      }
    },
    required: ["forecast", "reasoning", "trend"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        // System instruction helps set the analytical persona
        systemInstruction: "You are a precise financial forecasting engine. Focus on data patterns. Do not hallucinate numbers. Use weighted moving averages or regression logic implicitly for predictions.",
        temperature: 0.2, // Lower temperature for more deterministic/mathematical results
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI model");

    return JSON.parse(text) as ForecastResult;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Enhance error message for UI
    if (error.message && error.message.includes("429")) {
        throw new Error("ระบบกำลังทำงานหนักเกินไป (Rate Limit) กรุณารอสักครู่แล้วลองใหม่");
    }
    throw new Error("AI ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้: " + (error.message || "Unknown Error"));
  }
};
