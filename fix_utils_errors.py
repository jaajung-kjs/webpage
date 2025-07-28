#!/usr/bin/env python3
import re

# Read the file
with open('src/lib/api.modern.ts', 'r') as f:
    content = f.read()

# Fix the validateContent function
content = re.sub(
    r'return createErrorResponse\(error, \'Failed to perform operation\'\);\s*\n\s*valid: errors\.length === 0,\s*\n\s*errors\s*\n\s*}',
    '''return {
      valid: errors.length === 0,
      errors
    }''',
    content,
    flags=re.MULTILINE | re.DOTALL
)

# Fix the broken utility functions
# Fix getContentTypeLabel
content = re.sub(
    r'getContentTypeLabel, \(type: ContentType\): string',
    r'getContentTypeLabel(type: ContentType): string',
    content
)

# Fix formatActivityDate
content = re.sub(
    r'formatActivityDate\(scheduledAt: string \| null\): string \{',
    r'formatActivityDate(scheduledAt: string | null): string {',
    content
)

# Fix formatActivityTime
content = re.sub(
    r'formatActivityTime\(scheduledAt: string \| null\): string \{',
    r'formatActivityTime(scheduledAt: string | null): string {',
    content
)

# Fix formatDuration
content = re.sub(
    r'formatDuration\(durationMinutes: number \| null\): string \{',
    r'formatDuration(durationMinutes: number | null): string {',
    content
)

# Write the fixed content
with open('src/lib/api.modern.ts', 'w') as f:
    f.write(content)

print("Fixed utility function errors!")