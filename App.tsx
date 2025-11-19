import React, { useState, useMemo } from 'react';
import { BrainCircuit, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, Filter, Calendar, DollarSign, FileText } from 'lucide-react';
import { parseCSV } from './services/csvService';
import { getForecast } from './services/geminiService';
import { FileUpload } from './components/FileUpload';
import { ForecastChart } from './components/ForecastChart';
import { MonthlyData, ForecastResult, AppState, ChartDataPoint, ParsedDataSet } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // Data State
  const [fullDataset, setFullDataset] = useState<ParsedDataSet | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  
  // Visualization State
  const [currentHistory, setCurrentHistory] = useState<MonthlyData[]>([]);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Triggered when file is uploaded
  const handleFileSelect = async (file: File) => {
    try {
      setAppState(AppState.PARSING);
      setError(null);
      setSelectedClass('ALL'); // Reset filter
      
      // 1. Parse CSV with Aggregation
      const dataset = await parseCSV(file);
      setFullDataset(dataset);
      
      // Initial Analysis for TOTAL
      analyzeData(dataset.totalByDate, 'Total Portfolio');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      setAppState(AppState.ERROR);
    }
  };

  // Triggered when dropdown changes or initial load
  const analyzeData = async (data: MonthlyData[], segmentName: string) => {
    try {
        setCurrentHistory(data);
        setAppState(AppState.ANALYZING);
        setForecastResult(null); // Clear old forecast while loading

        const forecast = await getForecast(data, segmentName);
        
        setForecastResult(forecast);
        setAppState(AppState.SUCCESS);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "AI ไม่สามารถพยากรณ์ข้อมูลส่วนนี้ได้");
        setAppState(AppState.ERROR);
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cls = e.target.value;
      setSelectedClass(cls);
      
      if (fullDataset) {
          const dataToAnalyze = cls === 'ALL' 
            ? fullDataset.totalByDate 
            : fullDataset.byClass[cls] || [];
          
          const segmentName = cls === 'ALL' ? 'Total Portfolio' : `Account Class: ${cls}`;
          
          if (dataToAnalyze.length > 0) {
             analyzeData(dataToAnalyze, segmentName);
          } else {
             setError("ไม่มีข้อมูลสำหรับ Class ที่เลือก");
             setAppState(AppState.ERROR);
          }
      }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setFullDataset(null);
    setCurrentHistory([]);
    setForecastResult(null);
    setError(null);
    setSelectedClass('ALL');
  };

  // Merge Data for Chart
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!currentHistory.length) return [];

    const combined: ChartDataPoint[] = [];

    // Historical
    currentHistory.forEach(item => {
      combined.push({
        date: item.date,
        actual: item.amount,
        forecast: null
      });
    });

    // Forecast
    if (forecastResult) {
        // Connect lines visually: Set the forecast start point at the last actual point
        if (currentHistory.length > 0) {
             const lastHistory = currentHistory[currentHistory.length - 1];
             // We update the last actual point to also act as the start of the forecast line (for continuity)
             combined[combined.length - 1].forecast = lastHistory.amount; 
        }

        forecastResult.forecast.forEach(item => {
             combined.push({
                date: item.date,
                actual: null,
                forecast: item.amount
             });
        });
    }

    return combined;
  }, [currentHistory, forecastResult]);

  const getLastHistoryDate = () => {
    if (currentHistory.length === 0) return undefined;
    return currentHistory[currentHistory.length - 1].date;
  };

  const renderTrendIcon = (trend?: string) => {
      const t = trend?.toLowerCase() || '';
      if (t.includes('increas') || t.includes('up') || t.includes('grow')) return <TrendingUp className="text-emerald-500 w-6 h-6" />;
      if (t.includes('decreas') || t.includes('down') || t.includes('drop')) return <TrendingDown className="text-rose-500 w-6 h-6" />;
      return <Minus className="text-slate-400 w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20 transform transition-transform hover:scale-105">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">AI AR Forecaster</h1>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Powered by Gemini 2.5</p>
            </div>
          </div>
          {(appState === AppState.SUCCESS || appState === AppState.ANALYZING) && (
             <button 
                onClick={resetApp}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-indigo-100"
             >
                เริ่มใหม่
             </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-20">
        
        {/* Error Notification */}
        {appState === AppState.ERROR && (
          <div className="animate-fade-in mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4 shadow-sm max-w-3xl mx-auto">
            <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                <AlertTriangle className="text-red-600 w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button onClick={resetApp} className="mt-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors shadow-sm">
                ลองใหม่อีกครั้ง
              </button>
            </div>
          </div>
        )}

        {/* Intro / Upload Section */}
        {(appState === AppState.IDLE || appState === AppState.PARSING) && (
          <div className="max-w-2xl mx-auto mt-12 sm:mt-20 animate-fade-in px-4">
             <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
                  พยากรณ์ยอดลูกหนี้<br/>ด้วย <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">AI อัจฉริยะ</span>
                </h2>
                <p className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto">
                    อัปโหลดไฟล์ข้อมูลลูกหนี้ (CSV) เพื่อวิเคราะห์แนวโน้ม
                    แยกตาม Account Class และคาดการณ์ Cash Flow ล่วงหน้า
                </p>
             </div>

             <div className="bg-white p-2 rounded-3xl shadow-xl shadow-indigo-100/50 border border-slate-100">
                <FileUpload 
                    onFileSelect={handleFileSelect} 
                    isLoading={appState === AppState.PARSING} 
                />
             </div>

             <div className="mt-8 flex justify-center min-h-[40px]">
                 {appState === AppState.PARSING && (
                   <div className="flex items-center gap-3 text-indigo-600 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-full text-sm font-medium animate-pulse shadow-sm">
                      <Sparkles className="w-4 h-4" /> 
                      <span>กำลังประมวลผลข้อมูลและแยกประเภทบัญชี...</span>
                   </div>
                 )}
             </div>
          </div>
        )}

        {/* Control Bar (Filter) */}
        {(appState === AppState.SUCCESS || appState === AppState.ANALYZING) && fullDataset && (
           <div className="mb-8 animate-fade-in bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 sticky top-[72px] z-20">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
                        <Filter className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Filter Segment</p>
                        <p className="text-sm font-semibold text-slate-800">เลือกประเภทลูกหนี้ (Account Class)</p>
                    </div>
                </div>
                <div className="w-full md:w-auto flex-1 md:max-w-md">
                    <select 
                        value={selectedClass}
                        onChange={handleClassChange}
                        disabled={appState === AppState.ANALYZING}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                        <option value="ALL">ยอดรวมทั้งหมด (Total Portfolio)</option>
                        <optgroup label="แยกตาม Class">
                            {fullDataset.availableClasses.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
           </div>
        )}

        {/* Loading State for Analysis */}
        {appState === AppState.ANALYZING && (
            <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
                <div className="relative w-20 h-20 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <BrainCircuit className="absolute inset-0 m-auto text-indigo-600 w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Gemini กำลังวิเคราะห์ข้อมูล</h3>
                <p className="text-slate-500">
                    กำลังประเมินแนวโน้ม Seasonality และสร้างโมเดลพยากรณ์<br/>
                    สำหรับ <span className="text-indigo-600 font-semibold">"{selectedClass === 'ALL' ? 'Total Portfolio' : selectedClass}"</span>
                </p>
            </div>
        )}

        {/* Results Dashboard */}
        {appState === AppState.SUCCESS && forecastResult && (
          <div className="animate-fade-in space-y-6 sm:space-y-8">
            
            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Card 1: Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-100 to-transparent rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>
                   <div className="relative z-10 flex flex-col h-full justify-between">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                             {renderTrendIcon(forecastResult.trend)}
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Market Trend</span>
                       </div>
                       <div>
                            <p className="text-lg sm:text-xl font-bold text-slate-800 leading-snug line-clamp-2">
                                {forecastResult.trend}
                            </p>
                       </div>
                   </div>
                </div>

                {/* Card 2: Forecast Sum */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 pointer-events-none"></div>
                   <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-md">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider">Next 6 Months Forecast</p>
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-bold text-emerald-600 tabular-nums tracking-tight">
                            {new Intl.NumberFormat('th-TH', { style: 'decimal', notation: 'compact', maximumFractionDigits: 1 }).format(
                                forecastResult.forecast.reduce((acc, curr) => acc + curr.amount, 0)
                            )}
                        </h3>
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600/80 font-medium">
                             <ArrowRight className="w-3 h-3" /> ยอดรวมคาดการณ์
                        </div>
                   </div>
                </div>

                {/* Card 3: History Sum */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(99,102,241,0.1)] border border-slate-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                   <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-md">
                                <FileText className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-indigo-600/70 uppercase tracking-wider">Historical Volume</p>
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-bold text-indigo-600 tabular-nums tracking-tight">
                            {new Intl.NumberFormat('th-TH', { style: 'decimal', notation: 'compact', maximumFractionDigits: 1 }).format(
                                currentHistory.reduce((acc, curr) => acc + curr.amount, 0)
                            )}
                        </h3>
                        <div className="mt-2 text-xs text-indigo-400 font-medium">
                             Based on {currentHistory.length} months of data
                        </div>
                   </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-3xl p-1 sm:p-2 shadow-sm border border-slate-200">
                <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 mb-2">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Forecast Visualization
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {selectedClass === 'ALL' ? 'All Classes' : selectedClass}
                    </span>
                </div>
                <div className="w-full">
                    <ForecastChart data={chartData} splitDate={getLastHistoryDate()} />
                </div>
            </div>

            {/* Insight & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
               
               {/* AI Insight Box */}
               <div className="lg:col-span-2 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden flex flex-col">
                  {/* Decorative Background */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-60 h-60 bg-violet-600/10 blur-[60px] rounded-full -ml-10 -mb-10 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex-1">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-500/20 p-2 rounded-xl backdrop-blur-md border border-indigo-500/30 shadow-inner">
                            <Sparkles className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">AI Strategic Insight</h3>
                            <p className="text-indigo-200 text-xs uppercase tracking-widest font-semibold">Generated by Gemini 2.5</p>
                        </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none">
                        <p className="text-slate-300 leading-loose text-[15px] font-light whitespace-pre-line">
                            {forecastResult.reasoning}
                        </p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-8 pt-6 border-t border-slate-700/50 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                         <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                         Seasonality Detected
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
                         <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                         Pattern Recognition
                      </div>
                  </div>
               </div>

               {/* Forecast Table */}
               <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-[400px] lg:h-auto">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center justify-between flex-shrink-0">
                      <span>Monthly Breakdown</span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">
                          <Calendar className="w-3 h-3" />
                          Next 6M
                      </div>
                  </h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                      {forecastResult.forecast.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3.5 rounded-2xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-200 group">
                              <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                      {idx + 1}
                                  </span>
                                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{item.date}</span>
                              </div>
                              <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all tabular-nums">
                                  {new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(item.amount)}
                              </span>
                          </div>
                      ))}
                  </div>
               </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;