#!/usr/bin/env python3
import re

# Read the original file
with open('src/lib/api.modern.ts', 'r') as f:
    content = f.read()

# Fix the success responses
success_patterns = [
    (r'return { data: (.+?), success: true }', r'return createSuccessResponse(\1)'),
    (r'return { data, success: true }', r'return createSuccessResponse(data)'),
]

for pattern, replacement in success_patterns:
    content = re.sub(pattern, replacement, content)

# Fix the error responses that are broken
# First fix the broken createErrorResponse calls
content = re.sub(
    r'return createErrorResponse\(error,\s*error: error instanceof Error \? error\.message : \'(.+?)\',\s*success: false\s*\)',
    r"return createErrorResponse(error, '\1')",
    content,
    flags=re.DOTALL
)

# Fix other broken patterns
content = re.sub(
    r'return createErrorResponse\(error,\s*error: \'(.+?)\'\),\s*success: false\s*}',
    r"return createErrorResponse(error, '\1')",
    content,
    flags=re.DOTALL
)

# Fix broken success responses
content = re.sub(
    r'return createErrorResponse\(error,\s*data: ({[^}]+}),\s*success: true\s*}',
    r'return createSuccessResponse(\1)',
    content,
    flags=re.DOTALL
)

# Fix the validation function at the end
content = re.sub(
    r'return createErrorResponse\(error,\s*valid: errors\.length === 0,\s*errors\s*\)',
    r'return {\n      valid: errors.length === 0,\n      errors\n    }',
    content
)

# Write the fixed content
with open('src/lib/api.modern.ts', 'w') as f:
    f.write(content)

print("API file fixed!")