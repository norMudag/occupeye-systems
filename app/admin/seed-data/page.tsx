"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Check, AlertTriangle, Loader2 } from "lucide-react"
import { seedData } from "@/app/utils/seed-data"

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(false)

  const handleSeedData = async () => {
    setLoading(true)
    setSuccess(false)
    setError(false)
    
    try {
      const result = await seedData()
      if (result) {
        setSuccess(true)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Error seeding data:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Seed Database</h1>
          <p className="text-gray-600 mt-2">
            Initialize the database with sample dormitories and rooms data
          </p>
        </div>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Database Seeding</CardTitle>
            <CardDescription>
              This will clear existing dormitory and room data and add sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="mb-6 text-gray-600">
              This action will add sample dormitories and rooms to the database. It will overwrite any existing data in these collections. Use this for development and testing purposes only.
            </p>
            
            {success && (
              <Alert className="mb-6 bg-success/10 border-success text-success">
                <Check className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Database seeding completed successfully. The dormitories and rooms data has been added.
                </AlertDescription>
              </Alert>
            )}
            
            {error && (
              <Alert className="mb-6 bg-destructive/10 border-destructive text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to seed database. Check the console for more details.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-center">
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={handleSeedData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Database...
                  </>
                ) : (
                  "Seed Database"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 