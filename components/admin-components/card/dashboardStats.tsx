import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardStatsProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
}

export function DashboardStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: DashboardStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}