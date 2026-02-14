import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const endpointsPath = path.resolve(projectRoot, 'openapi/endpoints.json')
const modulesDir = path.resolve(projectRoot, 'src/api/modules')

/**
 * @typedef {Object} Endpoint
 * @property {string} method
 * @property {string} path
 * @property {string} request
 * @property {string} response
 */

/**
 * @typedef {Object} ParsedRequest
 * @property {string | null} bodyType
 * @property {string[]} queryKeys
 * @property {string[]} pathKeys
 */

const moduleOrder = ['auth', 'system', 'crop', 'material', 'iot', 'task', 'report']

/** @type {Endpoint[]} */
const endpoints = JSON.parse(readFileSync(endpointsPath, 'utf8'))

/**
 * @param {string} pathname
 */
function detectModule(pathname) {
  if (pathname === '/login' || pathname === '/register') {
    return 'auth'
  }

  const [first] = pathname.split('/').filter(Boolean)
  if (!first) {
    return 'auth'
  }

  if (moduleOrder.includes(first)) {
    return first
  }

  return 'auth'
}

/**
 * @param {string} value
 */
function toPascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * @param {string} value
 */
function toCamelCase(value) {
  const pascal = toPascalCase(value)
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : pascal
}

/**
 * @param {string} segment
 */
function sanitizeSegment(segment) {
  return segment.replace(/[{}]/g, '')
}

/**
 * @param {string} method
 * @param {string} pathname
 */
function buildFunctionName(method, pathname) {
  if (pathname === '/login' && method === 'post') {
    return 'login'
  }

  if (pathname === '/register' && method === 'post') {
    return 'register'
  }

  const segments = pathname.split('/').filter(Boolean)
  const staticSegments = segments.filter((segment) => !segment.startsWith('{'))
  const pathSegments = segments
    .filter((segment) => segment.startsWith('{') && segment.endsWith('}'))
    .map(sanitizeSegment)

  if (method === 'get' && staticSegments.at(-1) === 'list') {
    const target = staticSegments.slice(0, -1).join(' ')
    return `list${toPascalCase(target)}`
  }

  const methodMap = {
    get: 'get',
    post: 'create',
    put: 'update',
    delete: 'remove',
  }

  const prefix = methodMap[method] ?? 'request'
  const resourceName = staticSegments.join(' ') || 'root'
  let functionName = `${prefix}${toPascalCase(resourceName)}`

  if (pathSegments.length > 0) {
    functionName += `By${toPascalCase(pathSegments.join(' '))}`
  }

  return toCamelCase(functionName)
}

/**
 * @param {string} requestText
 * @param {string} pathname
 * @returns {ParsedRequest}
 */
function parseRequest(requestText, pathname) {
  const pathKeys = Array.from(pathname.matchAll(/\{([A-Za-z0-9_]+)\}/g)).map((match) => match[1])
  const queryKeys = []
  let bodyType = null

  if (requestText.includes('body:')) {
    const bodyMatch = requestText.match(/body:\s*([A-Za-z0-9_]+)/)
    if (bodyMatch) {
      bodyType = bodyMatch[1]
    }
  }

  if (requestText.includes('params:')) {
    const paramsRaw = requestText.replace(/^params:\s*/, '').split(',')
    for (const paramEntry of paramsRaw) {
      const item = paramEntry.trim()
      if (!item) {
        continue
      }

      if (item.startsWith('query.')) {
        queryKeys.push(item.slice('query.'.length))
      } else if (item.startsWith('path.')) {
        const key = item.slice('path.'.length)
        if (!pathKeys.includes(key)) {
          pathKeys.push(key)
        }
      }
    }
  }

  return {
    bodyType,
    queryKeys: Array.from(new Set(queryKeys)),
    pathKeys: Array.from(new Set(pathKeys)),
  }
}

/**
 * @param {string} responseText
 */
function parseResponseType(responseText) {
  if (responseText.includes('R<Void>')) {
    return 'void'
  }

  const arrayMatch = responseText.match(/R<Array<([A-Za-z0-9_]+)>>/)
  if (arrayMatch) {
    return `${arrayMatch[1]}[]`
  }

  const genericMatch = responseText.match(/R<([A-Za-z0-9_]+)>/)
  if (genericMatch) {
    const genericType = genericMatch[1]
    if (genericType.startsWith('Page')) {
      return `MpPage<${genericType.slice(4)}>`
    }

    return genericType
  }

  return 'unknown'
}

/**
 * @param {string} key
 */
function inferFieldType(key) {
  if (/id$/i.test(key) || /ids$/i.test(key) || /(pageNum|pageSize|status)$/i.test(key)) {
    return 'number | string'
  }

  if (/time$/i.test(key)) {
    return 'string'
  }

  if (/name$/i.test(key)) {
    return 'string'
  }

  return 'string | number'
}

/**
 * @param {string} returnType
 */
function extractModelTypes(returnType) {
  const names = new Set()
  const matches = returnType.match(/[A-Z][A-Za-z0-9_]*/g) ?? []
  for (const item of matches) {
    if (item !== 'MpPage') {
      names.add(item)
    }
  }

  return names
}

/**
 * @param {string} method
 */
function httpFunctionName(method) {
  if (method === 'delete') {
    return 'del'
  }

  return method
}

/**
 * @param {string} pathname
 * @param {string[]} pathKeys
 */
function buildUrlExpression(pathname, pathKeys) {
  if (pathKeys.length === 0) {
    return `'${pathname}'`
  }

  const template = pathname.replace(/\{([A-Za-z0-9_]+)\}/g, '${params.$1}')
  return `\`${template}\``
}

/**
 * @param {string} functionName
 */
function buildParamsInterfaceName(functionName) {
  return `${toPascalCase(functionName)}Params`
}

/** @type {Record<string, Endpoint[]>} */
const grouped = {}
for (const moduleName of moduleOrder) {
  grouped[moduleName] = []
}

for (const endpoint of endpoints) {
  const moduleName = detectModule(endpoint.path)
  grouped[moduleName].push(endpoint)
}

mkdirSync(modulesDir, { recursive: true })

for (const moduleName of moduleOrder) {
  /** @type {Endpoint[]} */
  const moduleEndpoints = grouped[moduleName] ?? []
  const usedNames = new Set()

  /** @type {string[]} */
  const bodyLines = []
  const httpFns = new Set()
  const modelTypes = new Set()
  let usesMpPage = false

  for (const endpoint of moduleEndpoints) {
    const method = endpoint.method.toLowerCase()
    const parsedRequest = parseRequest(endpoint.request || '', endpoint.path)
    const returnType = parseResponseType(endpoint.response || '')
    const baseFunctionName = buildFunctionName(method, endpoint.path)

    let functionName = baseFunctionName
    let nameIndex = 2
    while (usedNames.has(functionName)) {
      functionName = `${baseFunctionName}${nameIndex}`
      nameIndex += 1
    }
    usedNames.add(functionName)

    const paramsInterfaceName = buildParamsInterfaceName(functionName)
    const hasParams = parsedRequest.queryKeys.length > 0 || parsedRequest.pathKeys.length > 0
    const hasBody = Boolean(parsedRequest.bodyType)
    const httpFn = httpFunctionName(method)
    httpFns.add(httpFn)

    if (parsedRequest.bodyType) {
      modelTypes.add(parsedRequest.bodyType)
    }

    for (const typeName of extractModelTypes(returnType)) {
      modelTypes.add(typeName)
    }

    if (returnType.includes('MpPage<')) {
      usesMpPage = true
    }

    if (hasParams) {
      bodyLines.push(`export interface ${paramsInterfaceName} {`)
      for (const key of parsedRequest.pathKeys) {
        bodyLines.push(`  ${key}: ${inferFieldType(key)}`)
      }
      for (const key of parsedRequest.queryKeys) {
        bodyLines.push(`  ${key}?: ${inferFieldType(key)}`)
      }
      bodyLines.push('}')
      bodyLines.push('')
    }

    const signatureParts = []
    if (hasParams) {
      signatureParts.push(`params: ${paramsInterfaceName}`)
    }
    if (hasBody && parsedRequest.bodyType) {
      signatureParts.push(`body: ${parsedRequest.bodyType}`)
    }

    bodyLines.push(
      `export function ${functionName}(${signatureParts.join(', ')}): Promise<${returnType}> {`,
    )

    const urlExpression = buildUrlExpression(endpoint.path, parsedRequest.pathKeys)
    const queryLiteral =
      parsedRequest.queryKeys.length > 0
        ? `{ ${parsedRequest.queryKeys.map((key) => `${key}: params.${key}`).join(', ')} }`
        : ''

    if (method === 'get' || method === 'delete') {
      if (parsedRequest.queryKeys.length > 0) {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression}, { params: ${queryLiteral} })`)
      } else {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression})`)
      }
    } else if (hasBody) {
      if (parsedRequest.queryKeys.length > 0) {
        bodyLines.push(
          `  return ${httpFn}<${returnType}>(${urlExpression}, body, { params: ${queryLiteral} })`,
        )
      } else {
        bodyLines.push(`  return ${httpFn}<${returnType}>(${urlExpression}, body)`)
      }
    } else {
      if (parsedRequest.queryKeys.length > 0) {
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

  const imports = []
  if (httpFns.size > 0) {
    imports.push(`import { ${Array.from(httpFns).sort().join(', ')} } from '@/api/http'`)
  } else {
    imports.push("import {} from '@/api/http'")
  }

  const modelTypeImports = Array.from(modelTypes).sort()
  if (modelTypeImports.length > 0) {
    imports.push(`import type { ${modelTypeImports.join(', ')} } from '@/api/types/models'`)
  }

  if (usesMpPage) {
    imports.push("import type { MpPage } from '@/api/types/http'")
  }

  const content = [
    '/* eslint-disable */',
    `// Auto-generated by scripts/generate-api-modules.mjs from openapi/endpoints.json.`,
    '// Do not edit this file manually.',
    '',
    ...imports,
    '',
    ...bodyLines,
  ].join('\n')

  writeFileSync(path.resolve(modulesDir, `${moduleName}.ts`), content, 'utf8')
}

const indexLines = moduleOrder.map((name) => `export * from './${name}'`)
writeFileSync(path.resolve(modulesDir, 'index.ts'), `${indexLines.join('\n')}\n`, 'utf8')

console.log('Generated API modules:', moduleOrder.join(', '))
