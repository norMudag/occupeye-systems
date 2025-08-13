"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { testOccupancyCalculation } from "@/app/utils/test-occupancy"

export default function OccupancyTestPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<{
    totalRooms: number;
    totalCapacity: number;
    currentOccupants: number;
    uniqueOccupants: number;
    overallOccupancy: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const dormId = "rSX3ZyMhUm0wYtgmSLQv";
  
  const runTest = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Running occupancy test for dormitory ${dormId}...`);
      const testResults = await testOccupancyCalculation(dormId);
      console.log('Test completed:', testResults);
      setResults(testResults);
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    runTest();
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dormitory Occupancy Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Testing occupancy calculation for dormitory ID: {dormId}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTest}
            disabled={isLoading}
          >
            {isLoading ? 'Running Test...' : 'Run Test Again'}
          </Button>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Calculating occupancy...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : results ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Overall Occupancy</span>
                    <span className="text-sm font-medium">{results.overallOccupancy}%</span>
                  </div>
                  <Progress 
                    value={results.overallOccupancy} 
                    className={`h-2 ${
                      results.overallOccupancy > 90 
                        ? "bg-muted [&>div]:bg-warning" 
                        : results.overallOccupancy > 70 
                          ? "bg-muted [&>div]:bg-primary" 
                          : "bg-muted [&>div]:bg-success"
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.currentOccupants} occupants / {results.totalCapacity} capacity
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm font-medium">Total Rooms</div>
                    <div className="text-2xl font-bold">{results.totalRooms}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm font-medium">Total Capacity</div>
                    <div className="text-2xl font-bold">{results.totalCapacity}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm font-medium">Current Occupants</div>
                    <div className="text-2xl font-bold">{results.currentOccupants}</div>
                  </div>
                  <div className="bg-muted/20 p-3 rounded">
                    <div className="text-sm font-medium">Unique Occupants</div>
                    <div className="text-2xl font-bold">{results.uniqueOccupants}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Calculation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/10 p-4 rounded border border-dashed">
                  <p className="font-mono">
                    {results.currentOccupants} / {results.totalCapacity} * 100 = {results.overallOccupancy}%
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Explanation</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>We found {results.totalRooms} rooms in this dormitory</li>
                    <li>Total capacity across all rooms: {results.totalCapacity}</li>
                    <li>Current occupants count: {results.currentOccupants}</li>
                    <li>Unique occupant IDs found: {results.uniqueOccupants}</li>
                    <li>Occupancy rate: {results.overallOccupancy}%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center">No results available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 