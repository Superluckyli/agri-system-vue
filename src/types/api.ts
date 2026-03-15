export type R<T> = {
    code: number
    msg: string
    data: T
}

export type PageResult<T> = {
    page: number
    size: number
    total: number
    items: T[]
}

/** @deprecated 使用 PageResult<T> 代替 */
export type MpPage<T> = PageResult<T>
