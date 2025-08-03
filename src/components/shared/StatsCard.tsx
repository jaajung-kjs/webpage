'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { scaleIn } from '@/lib/animations'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  subtitle?: string
  loading?: boolean
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  loading = false 
}: StatsCardProps) {
  return (
    <motion.div {...scaleIn} whileHover={{ scale: 1.02 }}>
      <Card className="h-full min-h-[120px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? '-' : value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
    </motion.div>
  )
}