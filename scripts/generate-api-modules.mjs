import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const endpointsPath = path.resolve(projectRoot, 'openapi/endpoints.json')
const modulesDir = path.resolve(projectRoot, 'src/api/modules')

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const moduleOrder = ['auth', 'system', 'crop', 'material', 'supplier', 'purchase', 'iot', 'task', 'report']

const actionVerbs = new Set([
  'complete', 'confirm', 'cancel', 'suspend', 'resume', 'review',
  'reassign', 'start', 'pause', 'harvest', 'abandon', 'archive', 'receive',
  'assign', 'accept', 'reject',
])

// ---------------------------------------------------------------------------
// Read endpoints (strip BOM if present)
// ---------------------------------------------------------------------------

let rawJson = readFileSync(endpointsPath, 'utf8')
if (rawJson.charCodeAt(0) === 0xfeff) {
  rawJson = rawJson.slice(1)
}

/** @type {Array<Object>} */
const endpoints = JSON.parse(rawJson)

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/** @param {string} value */
function toPascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** @param {string} value */
function toCamelCase(value) {
  const pascal = toPascalCase(value)
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : pascal
}

/** @param {string} segment — e.g. "{userId}" → "userId" */
function sanitizeSegment(segment) {
  return segment.replace(/[{}]/g, '')
}

// ---------------------------------------------------------------------------
// Module detection
// ---------------------------------------------------------------------------

/** @param {string} pathname */
function detectModule(pathname) {
  if (pathname === '/login' || pathname === '/register') return 'auth'

  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  if (!first) return 'auth'

  if (moduleOrder.includes(first)) return first

  return 'auth'
}

// ---------------------------------------------------------------------------
// Request parsing (structured object input)
// ---------------------------------------------------------------------------

/**
 * @param {Object|null|undefined} requestObj — endpoint.request
 * @param {string} pathname
 */
function parseRequest(requestObj, pathname) {
  // pathKeys: prefer schema.path, fallback to URL regex
  const schemaPath = requestObj?.schema?.path ?? {}
  let pathKeys = Object.keys(schemaPath)
  if (pathKeys.length === 0) {
    pathKeys = Array.from(pathname.matchAll(/\{([A-Za-z0-9_]+)\}/g)).map((m) => m[1])
  }

  // queryKeys: from schema.query
  const schemaQuery = requestObj?.schema?.query ?? {}
  const queryKeys = Object.keys(schemaQuery)

  // bodyType: from schema.body (string type name or null)
  const rawBody = requestObj?.schema?.body
  const bodyType = typeof rawBody === 'string' && rawBody ? rawBody : null

  return { bodyType, queryKeys, pathKeys }
}

// ---------------------------------------------------------------------------
// Response type parsing (structured object input)
// ---------------------------------------------------------------------------

/** @param {Object|null|undefined} responseObj — endpoint.response */
function parseResponseType(responseObj) {
  const text = responseObj?.schema ?? ''

  if (text.includes('R<Void>')) return 'void'

  // R<Page<T>> → MpPage<T>
  const pageMatch = text.match(/R<Page<([A-Za-z0-9_]+)>>/)
  if (pageMatch) return `MpPage<${pageMatch[1]}>`

  // R<List<T>> or R<Array<T>> → T[]
  const listMatch = text.match(/R<(?:List|Array)<([A-Za-z0-9_]+)>>/)
  if (listMatch) return `${listMatch[1]}[]`

  // R<T> (simple generic — also handles descriptive prefix like "Login result (R<LoginData>)")
  const genericMatch = text.match(/R<([A-Za-z0-9_]+)>/)
  if (genericMatch) return genericMatch[1]

  return 'unknown'
}

// ---------------------------------------------------------------------------
// Function name generation
// ---------------------------------------------------------------------------

/** @param {string} method @param {string} pathname @param {string[]} [schemaPathKeys] */
function buildFunctionName(method, pathname, schemaPathKeys) {
  // Special paths
  if (pathname === '/login') return 'login'
  if (pathname === '/register') return 'register'

  const segments = pathname.split('/').filter(Boolean)
  const staticSegments = segments.filter((s) => !s.startsWith('{'))
  const pathParams = segments.filter((s) => s.startsWith('{') && s.endsWith('}')).map(sanitizeSegment)
  const lastStatic = staticSegments.at(-1)

  // GET .../list → listXxx
  if (method === 'get' && lastStatic === 'list') {
    const target = staticSegments.slice(0, -1).join(' ')
    return `list${toPascalCase(target)}`
  }

  // GET .../all → getXxxAll
  if (method === 'get' && lastStatic === 'all') {
    const target = staticSegments.slice(0, -1).join(' ')
    return `get${toPascalCase(target)}All`
  }

  // GET .../low-stock → getXxxLowStock
  if (method === 'get' && lastStatic === 'low-stock') {
    const target = staticSegments.slice(0, -1).join(' ')
    return `get${toPascalCase(target)}LowStock`
  }

  // Action verb endpoint: /task/{id}/complete → completeTask
  if (actionVerbs.has(lastStatic)) {
    const resourceSegments = staticSegments.slice(0, -1) // drop the verb
    // drop the module prefix (first segment if it's in moduleOrder)
    const filtered = resourceSegments.filter((s, i) => i > 0 || !moduleOrder.includes(s))
    // If no resource remains after stripping module prefix, use the module name itself
    // e.g. /task/assign → assign + Task, /task/accept → accept + Task
    const resourceName = filtered.length > 0
      ? toPascalCase(filtered.join(' '))
      : toPascalCase(resourceSegments[0] ?? '')
    return `${lastStatic}${resourceName}`
  }

  // GET with path params and the last static is NOT an action verb or "list"/"all"
  // e.g. GET /crop/growth-log/list/{batchId} is handled above
  // e.g. GET /task/log/{taskId} → getTaskLog (if it's just a path-param fetch)
  // e.g. POST /material/log/execute → createMaterialLogExecute

  // DELETE with path params → removeXxxByYyy (prefer schema path keys over URL placeholders)
  if (method === 'delete') {
    const target = staticSegments.join(' ')
    const deleteParamNames = (schemaPathKeys && schemaPathKeys.length > 0) ? schemaPathKeys : pathParams
    if (deleteParamNames.length > 0) {
      return `remove${toPascalCase(target)}By${toPascalCase(deleteParamNames.join(' '))}`
    }
    return `remove${toPascalCase(target)}`
  }

  // Default: method prefix + resource
  const methodMap = { get: 'get', post: 'create', put: 'update', delete: 'remove' }
  const prefix = methodMap[method] ?? 'request'
  const resourceName = staticSegments.join(' ') || 'root'
  let functionName = `${prefix}${toPascalCase(resourceName)}`

  // Only append ByXxx for GET with path params (non-list/all endpoints)
  if (method === 'get' && pathParams.length > 0) {
    functionName = `get${toPascalCase(staticSegments.join(' '))}By${toPascalCase(pathParams.join(' '))}`
  }

  return toCamelCase(functionName)
}

// ---------------------------------------------------------------------------
// Signature scenario helpers
// ---------------------------------------------------------------------------

/** @param {string} method @param {string} pathname */
function isListEndpoint(method, pathname) {
  return method === 'get' && pathname.endsWith('/list')
}

/** @param {string} method @param {string[]} pathKeys */
function isBatchDelete(method, pathKeys) {
  return method === 'delete' && pathKeys.some((k) => k.toLowerCase().includes('ids'))
}

/**
 * Whether the path params should be expanded as direct function parameters
 * (as opposed to being wrapped in a Params interface).
 */
function useDirectPathParams(method, pathname, pathKeys) {
  if (isListEndpoint(method, pathname)) return false
  if (isBatchDelete(method, pathKeys)) return false
  if (pathKeys.length === 0) return false
  // Single path param (with or without body) → direct params
  if (pathKeys.length >= 1) return true
  return false
}

// ---------------------------------------------------------------------------
// Field type inference
// ---------------------------------------------------------------------------

/** @param {string} key */
function inferFieldType(key) {
  if (/id$/i.test(key) || /ids$/i.test(key) || /(pageNum|pageSize|status)$/i.test(key)) {
    return 'number | string'
  }
  if (/time$/i.test(key)) return 'string'
  if (/name$/i.test(key)) return 'string'
  return 'string | number'
}

// ---------------------------------------------------------------------------
// Type extraction from return type string
// ---------------------------------------------------------------------------

/** @param {string} returnType */
function extractModelTypes(returnType) {
  const names = new Set()
  const matches = returnType.match(/[A-Z][A-Za-z0-9_]*/g) ?? []
  for (const item of matches) {
    if (item !== 'MpPage' && item !== 'Promise') {
      names.add(item)
    }
  }
  return names
}

// ---------------------------------------------------------------------------
// HTTP method → function name mapping
// ---------------------------------------------------------------------------

/** @param {string} method */
function httpFunctionName(method) {
  return method === 'delete' ? 'del' : method
}

// ---------------------------------------------------------------------------
// URL expression builder
// ---------------------------------------------------------------------------

/**
 * @param {string} pathname
 * @param {string[]} pathKeys — schema path keys (may differ from URL placeholders)
 * @param {boolean} directParams — whether path params are direct function args
 */
function buildUrlExpression(pathname, pathKeys, directParams) {
  if (pathKeys.length === 0) return `'${pathname}'`

  // Extract URL placeholder names in order
  const urlPlaceholders = Array.from(pathname.matchAll(/\{([A-Za-z0-9_]+)\}/g)).map((m) => m[1])

  // Build URL by replacing each placeholder with the corresponding schema key (by position).
  // This handles cases where schema key differs from URL placeholder
  // (e.g. DELETE /system/user/{userId} with schema key "userIds").
  const varPrefix = directParams ? '' : 'params.'
  let result = pathname
  for (let i = 0; i < urlPlaceholders.length; i++) {
    const schemaKey = pathKeys[i] ?? urlPlaceholders[i]
    result = result.replace(`{${urlPlaceholders[i]}}`, `\${${varPrefix}${schemaKey}}`)
  }
  return `\`${result}\``
}

// ---------------------------------------------------------------------------
// Params interface name builder
// ---------------------------------------------------------------------------

/** @param {string} functionName */
function buildParamsInterfaceName(functionName) {
  return `${toPascalCase(functionName)}Params`
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

/** @type {Record<string, Object[]>} */
const grouped = {}
for (const moduleName of moduleOrder) {
  grouped[moduleName] = []
}

for (const endpoint of endpoints) {
  const moduleName = detectModule(endpoint.path)
  if (!grouped[moduleName]) {
    grouped[moduleName] = []
  }
  grouped[moduleName].push(endpoint)
}

mkdirSync(modulesDir, { recursive: true })

for (const moduleName of moduleOrder) {
  /** @type {Object[]} */
  const moduleEndpoints = grouped[moduleName] ?? []
  const usedNames = new Set()

  /** @type {string[]} */
  const bodyLines = []
  const httpFns = new Set()
  const modelTypes = new Set()
  let usesMpPage = false

  for (const endpoint of moduleEndpoints) {
    const method = endpoint.method.toLowerCase()
    const parsedRequest = parseRequest(endpoint.request, endpoint.path)
    const returnType = parseResponseType(endpoint.response)
    const baseFunctionName = buildFunctionName(method, endpoint.path, parsedRequest.pathKeys)

    // Deduplicate function names
    let functionName = baseFunctionName
    let nameIndex = 2
    while (usedNames.has(functionName)) {
      functionName = `${baseFunctionName}${nameIndex}`
      nameIndex += 1
    }
    usedNames.add(functionName)

    const { bodyType, queryKeys, pathKeys } = parsedRequest
    const hasBody = Boolean(bodyType)
    const httpFn = httpFunctionName(method)
    httpFns.add(httpFn)

    // Collect model types for imports
    if (bodyType) modelTypes.add(bodyType)
    for (const typeName of extractModelTypes(returnType)) {
      modelTypes.add(typeName)
    }
    if (returnType.includes('MpPage<')) {
      usesMpPage = true
    }

    // Determine signature style
    const directParams = useDirectPathParams(method, endpoint.path, pathKeys, hasBody)
    const needsParamsInterface = !directParams && (queryKeys.length > 0 || pathKeys.length > 0)

    // --- Generate Params interface (if needed) ---
    if (needsParamsInterface) {
      const paramsInterfaceName = buildParamsInterfaceName(functionName)
      bodyLines.push(`export interface ${paramsInterfaceName} {`)
      for (const key of pathKeys) {
        bodyLines.push(`  ${key}: ${inferFieldType(key)}`)
      }
      for (const key of queryKeys) {
        bodyLines.push(`  ${key}?: ${inferFieldType(key)}`)
      }
      bodyLines.push('}')
      bodyLines.push('')
    }

    // --- Build function signature ---
    const signatureParts = []

    if (directParams) {
      // Expand path keys as direct function parameters
      for (const key of pathKeys) {
        signatureParts.push(`${key}: ${inferFieldType(key)}`)
      }
      if (hasBody) {
        signatureParts.push(`body: ${bodyType}`)
      }
    } else {
      if (needsParamsInterface) {
        signatureParts.push(`params: ${buildParamsInterfaceName(functionName)}`)
      }
      if (hasBody) {
        signatureParts.push(`body: ${bodyType}`)
      }
    }

    bodyLines.push(
      `export function ${functionName}(${signatureParts.join(', ')}): Promise<${returnType}> {`,
    )

    // --- Build function body ---
    const urlExpression = buildUrlExpression(endpoint.path, pathKeys, directParams)

    // Query literal for GET/DELETE with query params
    const queryLiteral =
      queryKeys.length > 0
        ? `{ ${queryKeys.map((key) => `${key}: params.${key}`).join(', ')} }`
        : ''

    if (method === 'get' || method === 'delete') {
      if (queryKeys.length > 0) {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression}, { params: ${queryLiteral} })`)
      } else {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression})`)
      }
    } else if (hasBody) {
      if (queryKeys.length > 0) {
        bodyLines.push(
          `  return ${httpFn}<${returnType}>(${urlExpression}, body, { params: ${queryLiteral} })`,
        )
      } else {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression}, body)`)
      }
    } else {
      if (queryKeys.length > 0) {
        bodyLines.push(
          `  return ${httpFn}<${returnType}>(${urlExpression}, undefined, { params: ${queryLiteral} })`,
        )
      } else {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression})`)
      }
    }

    bodyLines.push('}')
    bodyLines.push('')
  }

  // --- Build file header ---
  const imports = []
  if (httpFns.size > 0) {
    imports.push(`import { ${Array.from(httpFns).sort().join(', ')} } from '@/api/http'`)
  } else {
    imports.push("import {} from '@/api/http'")
  }

  const modelTypeImports = Array.from(modelTypes).sort()
  if (modelTypeImports.length > 0) {
    imports.push(`import type { ${modelTypeImports.join(', ')} } from '@/types/entity'`)
  }

  if (usesMpPage) {
    imports.push("import type { MpPage } from '@/types/api'")
  }

  const content = [
    '/* eslint-disable */',
    '// Auto-generated by scripts/generate-api-modules.mjs from openapi/endpoints.json.',
    '// Do not edit this file manually.',
    '',
    ...imports,
    '',
    ...bodyLines,
  ].join('\n')

  writeFileSync(path.resolve(modulesDir, `${moduleName}.ts`), content, 'utf8')
}

// --- Generate index.ts ---
const indexLines = moduleOrder.map((name) => `export * from './${name}'`)
writeFileSync(path.resolve(modulesDir, 'index.ts'), `${indexLines.join('\n')}\n`, 'utf8')

console.log('Generated API modules:', moduleOrder.join(', '))
