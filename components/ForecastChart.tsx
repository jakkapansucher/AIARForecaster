import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartDataPoint } from '../types';

interface ForecastChartProps {
  data: ChartDataPoint[];
  splitDate?: string; // The date where history ends and forecast begins
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, splitDate }) => {
  
  const formatYAxis = (value: number) => {
    return new Intl.NumberFormat('en', { notation: "compact", compactDisplay: "short" }).format(value);
  };

  const formatXAxis = (date: string) => {
    // Shorten date if needed, e.g., 2024-01 -> Jan 24
    return date;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isForecast = payload.some((p: any) => p.dataKey === 'forecast' && p.value !== null && p.payload.actual === null);
      
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-200 shadow-xl rounded-xl text-sm ring-1 ring-slate-100 z-50">
          <p className="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2 flex justify-between items-center gap-6">
            <span>{label}</span>
            {isForecast && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-indigo-100">
                Forecast
              </span>
            )}
          </p>
          {payload.map((entry: any, index: number) => (
            entry.value !== null && (
              <div key={index} className="flex items-center justify-between gap-8 py-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500 font-medium text-xs uppercase tracking-wide">
                    {entry.name === 'actual' ? 'Actual' : 'Forecast'}
                    </span>
                </div>
                <span className="font-mono font-bold text-slate-800 text-base tabular-nums">
                  {new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 0 }).format(entry.value)}
                </span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px] sm:h-[500px] bg-white p-2 sm:p-6 rounded-3xl shadow-sm border border-slate-200/60">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={15}
            minTickGap={30}
          />
          
          <YAxis 
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dx={-5}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
          
          <Legend 
            verticalAlign="top" 
            height={40}
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          
          {splitDate && (
             <ReferenceLine 
                x={splitDate} 
                stroke="#cbd5e1" 
                strokeDasharray="3 3" 
                label={{ value: 'Current', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10, dy: -10 }} 
             />
          )}

          <Area 
            type="monotone" 
            dataKey="actual" 
            name="Actual Data"
            stroke="#6366f1" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorActual)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
          />
          
          <Line 
            type="monotone" 
            dataKey="forecast" 
            name="AI Forecast"
            stroke="#10b981" 
            strokeWidth={2.5} 
            strokeDasharray="6 6" 
            dot={{ stroke: '#10b981', strokeWidth: 2, r: 3, fill: 'white' }}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
            animationDuration={1500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};