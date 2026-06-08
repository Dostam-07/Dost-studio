// NOTE: Syntax validation with esbuild is done server-side in the build endpoint.
// The frontend validator handles regex-based fixes only (shadcn imports, default exports).

export interface ValidationResult {
  path: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed: boolean;
  content?: string;
}

export class CodeValidator {
  validate(content: string, path: string): ValidationResult {
    const result: ValidationResult = {
      path,
      valid: true,
      errors: [],
      warnings: [],
      fixed: false,
    };

    // Check for shadcn/ui imports
    if (/from\s+['"]@\/components\/ui\//.test(content)) {
      result.warnings.push('Contains shadcn/ui imports — removing');
      content = content.replace(/import\s+.*?from\s+['"]@\/components\/ui\/[^'"]+['"];?\s*/g, '');
      result.fixed = true;
    }

    // Check for missing default export in .tsx files (skip test files)
    if (path.endsWith('.tsx') && !path.includes('.test.') && !path.includes('.spec.') && !/\bexport\s+default\b/.test(content)) {
      const compMatch = content.match(/(?:const|function|class)\s+(\w+)\s*(?::\s*\w+(?:<[^>]*>)?)?\s*[=:]/);
      const functionComponentMatch = content.match(/function\s+(\w+)\s*(?:<[^>]*>)?\s*\(/);
      const name = functionComponentMatch?.[1] || compMatch?.[1];
      if (name && name !== 'default') {
        content += `\n\nexport default ${name};\n`;
        result.warnings.push(`Added missing default export for "${name}"`);
        result.fixed = true;
      } else {
        result.errors.push('Missing default export and could not detect component name');
      }
    }

    result.content = content;
    return result;
  }

  validateAll(files: { path: string; content: string }[]): ValidationResult[] {
    return files.map((f) => this.validate(f.content, f.path));
  }
}

export const codeValidator = new CodeValidator();
