
import { MonthlyData, ParsedDataSet } from '../types';

// Helper function to correctly parse CSV lines with quoted values containing commas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  // Clean up quotes and whitespace
  return result.map(val => {
    val = val.trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    return val.replace(/["\r]/g, '');
  });
};

export const parseCSV = async (file: File): Promise<ParsedDataSet> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
             reject(new Error("ไฟล์ CSV ว่างเปล่า"));
             return;
        }

        const lines = text.split(/\r?\n/);
        
        if (lines.length < 2) {
             reject(new Error("ไฟล์มีข้อมูลไม่เพียงพอ (ต้องมี Header และ Data)"));
             return;
        }

        // 1. Identify Headers
        // Clean headers: lowercase, remove special chars
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        // Target Columns based on requirement
        // Date: billPeriod
        let dateIndex = headers.indexOf('billperiod');
        // Fallback
        if (dateIndex === -1) dateIndex = headers.indexOf('monthly');
        
        // Amount: amount
        let amountIndex = headers.indexOf('amount');

        // Class: accountclass
        let classIndex = headers.indexOf('accountclass');
        // Fallback
        if (classIndex === -1) classIndex = headers.indexOf('actcode');
        if (classIndex === -1) classIndex = headers.indexOf('account_class');

        // Validation
        if (dateIndex === -1 || amountIndex === -1) {
          reject(new Error(`รูปแบบไฟล์ CSV ไม่ถูกต้อง: ขาดคอลัมน์จำเป็น 'billPeriod' หรือ 'amount' (Headers Found: ${lines[0]})`));
          return;
        }

        // Data Aggregation Structures
        const totalMap: Record<string, number> = {}; // { "2023-01": 50000 }
        const classMap: Record<string, Record<string, number>> = {}; // { "Residential": { "2023-01": 10000 } }
        const foundClasses = new Set<string>();
        let validRowCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = parseCSVLine(line);
          
          // Guard: Check if row has enough columns
          if (cols.length <= Math.max(dateIndex, amountIndex)) continue;

          const rawDate = cols[dateIndex];
          const rawAmount = cols[amountIndex];
          // If class column missing, default to 'Unclassified'
          const rawClass = classIndex !== -1 ? cols[classIndex] : 'Unclassified';

          if (!rawDate || !rawAmount) continue;

          // 2. Parse Date (billPeriod)
          // Expected format: YYYYMM (e.g., 202309, 202401)
          let dateKey = '';
          const cleanDate = rawDate.replace(/[^0-9]/g, ''); 
          
          if (cleanDate.length === 6) {
             // YYYYMM -> YYYY-MM
             const y = cleanDate.substring(0, 4);
             const m = cleanDate.substring(4, 6);
             dateKey = `${y}-${m}`;
          } else if (cleanDate.length === 8) {
             // YYYYMMDD -> YYYY-MM (Take first 6)
             const y = cleanDate.substring(0, 4);
             const m = cleanDate.substring(4, 6);
             dateKey = `${y}-${m}`;
          } else if (rawDate.includes('-') || rawDate.includes('/')) {
             // Try standard date parsing
             const d = new Date(rawDate);
             if (!isNaN(d.getTime())) {
               const y = d.getFullYear();
               const m = String(d.getMonth() + 1).padStart(2, '0');
               dateKey = `${y}-${m}`;
             }
          }

          if (!dateKey) continue; // Skip if date invalid

          // 3. Parse Amount
          const amount = parseFloat(rawAmount.replace(/,/g, ''));
          
          // 4. Clean Class Name
          const className = rawClass && rawClass.trim() !== '' ? rawClass.trim() : 'Unknown';

          if (!isNaN(amount)) {
            // A. Aggregate Total
            if (!totalMap[dateKey]) totalMap[dateKey] = 0;
            totalMap[dateKey] += amount;

            // B. Aggregate by Account Class
            if (!classMap[className]) classMap[className] = {};
            if (!classMap[className][dateKey]) classMap[className][dateKey] = 0;
            classMap[className][dateKey] += amount;
            
            foundClasses.add(className);
            validRowCount++;
          }
        }

        if (validRowCount === 0) {
             reject(new Error("ไม่พบข้อมูลที่สามารถประมวลผลได้ ตรวจสอบ format ของ billPeriod (YYYYMM) และ amount"));
             return;
        }

        // Sort function for dates (Ascending)
        const sortFn = (a: MonthlyData, b: MonthlyData) => a.date.localeCompare(b.date);

        // Prepare Total Data Array
        const totalData: MonthlyData[] = Object.entries(totalMap)
          .map(([date, amount]) => ({ date, amount }))
          .sort(sortFn);

        // Prepare Class Data Arrays
        const byClass: Record<string, MonthlyData[]> = {};
        foundClasses.forEach(cls => {
            const classData = Object.entries(classMap[cls])
                .map(([date, amount]) => ({ date, amount }))
                .sort(sortFn);
            
            // Optional: Fill missing months with 0 if needed (Gap filling)
            // For now, we keep sparse data as is, or Gemini might interpret gaps as zero/missing.
            
            byClass[cls] = classData;
        });

        resolve({
            totalByDate: totalData,
            byClass: byClass,
            availableClasses: Array.from(foundClasses).sort()
        });

      } catch (error) {
        console.error("CSV Parse Error:", error);
        reject(new Error("เกิดข้อผิดพลาดในการประมวลผลไฟล์ CSV"));
      }
    };

    reader.onerror = () => reject(new Error("Read Error"));
    reader.readAsText(file);
  });
};
