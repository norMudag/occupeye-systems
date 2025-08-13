"use client"

import React from 'react';
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Status Distribution Chart (Donut Chart)
export const StatusDistributionChart = ({ 
  data 
}: { 
  data: { approved: number; pending: number; denied: number } 
}) => {
  const chartData = [
    { name: 'Approved', value: data.approved, fill: '#10b981' }, // success color
    { name: 'Pending', value: data.pending, fill: '#f59e0b' },   // warning color
    { name: 'Denied', value: data.denied, fill: '#ef4444' }      // destructive color
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex space-x-8 items-center">
        <ResponsiveContainer width={150} height={150}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            />
            <Tooltip formatter={(value) => [`${value} (${((value as number) / total * 100).toFixed(0)}%)`, 'Count']} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="space-y-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.fill }}></div>
              <span className="text-sm">{entry.name}: {entry.value}</span>
            </div>
          ))}
          <div className="flex items-center mt-2">
            <span className="text-sm font-medium">Total: {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Weekly Reservation Trend Chart
export const WeeklyTrendChart = ({ 
  data 
}: { 
  data: { week: string; count: number }[] 
}) => {
  const maxCount = Math.max(...data.map(w => w.count), 10);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="week" 
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis 
          domain={[0, maxCount]} 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value === 0 ? '0' : value.toString()}
        />
        <Tooltip 
          formatter={(value) => [`${value} reservations`, 'Count']}
          labelFormatter={(label) => `${label}`}
        />
        <Bar 
          dataKey="count" 
          fill="#2563eb" 
          radius={[4, 4, 0, 0]}
          name="Reservations"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// RFID Activity Chart
export const RFIDActivityChart = ({ 
  hours, 
  entryData, 
  exitData 
}: { 
  hours: string[]; 
  entryData: number[]; 
  exitData: number[] 
}) => {
  const data = hours.map((hour, index) => ({
    hour,
    entries: entryData[index] || 0,
    exits: exitData[index] || 0
  }));

  // Determine if we should show all labels or just some
  const showEveryNthLabel = hours.length > 12 ? 4 : 1;
  
  // Calculate the maximum value for better Y-axis scaling
  const maxValue = Math.max(
    ...entryData, 
    ...exitData,
    1  // Ensure at least 1 for empty data sets
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="hour" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          interval={showEveryNthLabel === 1 ? 0 : (index) => index % showEveryNthLabel === 0}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          domain={[0, Math.ceil(maxValue * 1.1)]} // Add 10% padding to the top
        />
        <Tooltip 
          formatter={(value, name) => [value, name === 'Entries' ? 'Entries' : 'Exits']}
          labelFormatter={(label) => {
            // Format label based on data type
            if (label.includes(':')) {
              return `Time: ${label}`;
            } else if (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(label)) {
              return `Day: ${label}`;
            } else {
              return label;
            }
          }}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="entries" 
          stackId="1"
          stroke="#10b981" 
          fill="#10b981" 
          fillOpacity={0.6}
          name="Entries"
        />
        <Area 
          type="monotone" 
          dataKey="exits" 
          stackId="1"
          stroke="#f59e0b" 
          fill="#f59e0b"
          fillOpacity={0.6} 
          name="Exits"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}; 