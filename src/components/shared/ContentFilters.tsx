'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterGroup {
  id: string
  label: string
  type: 'radio' | 'checkbox' | 'select'
  options: FilterOption[]
  value?: string | string[]
  onChange: (value: any) => void
}

interface ContentFiltersProps {
  filterGroups: FilterGroup[]
  onReset?: () => void
  activeFiltersCount?: number
}

export default function ContentFilters({
  filterGroups,
  onReset,
  activeFiltersCount = 0,
}: ContentFiltersProps) {
  const renderFilterGroup = (group: FilterGroup) => {
    switch (group.type) {
      case 'radio':
        return (
          <div key={group.id} className="space-y-3">
            <Label className="text-sm font-medium">{group.label}</Label>
            <RadioGroup
              value={group.value as string}
              onValueChange={group.onChange}
            >
              {group.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${group.id}-${option.value}`} />
                  <Label
                    htmlFor={`${group.id}-${option.value}`}
                    className="flex items-center justify-between flex-1 cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({option.count})
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 'checkbox':
        const selectedValues = group.value as string[] || []
        return (
          <div key={group.id} className="space-y-3">
            <Label className="text-sm font-medium">{group.label}</Label>
            <div className="space-y-2">
              {group.options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${group.id}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        group.onChange([...selectedValues, option.value])
                      } else {
                        group.onChange(
                          selectedValues.filter((v) => v !== option.value)
                        )
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${group.id}-${option.value}`}
                    className="flex items-center justify-between flex-1 cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({option.count})
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'select':
        return (
          <div key={group.id} className="space-y-3">
            <Label className="text-sm font-medium">{group.label}</Label>
            <Select
              value={group.value as string}
              onValueChange={group.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={`${group.label} 선택`} />
              </SelectTrigger>
              <SelectContent>
                {group.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                    {option.count !== undefined && ` (${option.count})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            필터
            {activeFiltersCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({activeFiltersCount}개 활성)
              </span>
            )}
          </CardTitle>
          {onReset && activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              초기화
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {filterGroups.map(renderFilterGroup)}
        </div>
      </CardContent>
    </Card>
  )
}