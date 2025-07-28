#!/usr/bin/env python3
import re

# Read the file
with open('src/lib/api.modern.ts', 'r') as f:
    content = f.read()

# Pattern to fix broken createErrorResponse calls
# This pattern matches createErrorResponse followed by erroneous syntax
pattern = r'(return createErrorResponse\(error, [\'"][^\'\"]+[\'"]\));?\s*\n\s*error: error instanceof Error \? error\.message : [\'"][^\'\"]+[\'"]\s*,\s*\n\s*success: false\s*\n?\s*}'

# Replace with just the createErrorResponse call
replacement = r'\1'

# Apply the fix
content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

# Also fix any remaining syntax errors where we have standalone error: and success: lines
content = re.sub(
    r'\n\s*error: error instanceof Error \? error\.message : [\'"][^\'\"]+[\'"]\s*,\s*\n\s*success: false\s*\n?\s*}',
    '',
    content,
    flags=re.MULTILINE
)

# Fix any remaining standalone success: false lines
content = re.sub(
    r'\n\s*success: false\s*\n?\s*}',
    '\n    }',
    content,
    flags=re.MULTILINE
)

# Write the fixed content
with open('src/lib/api.modern.ts', 'w') as f:
    f.write(content)

print("Fixed API errors!")