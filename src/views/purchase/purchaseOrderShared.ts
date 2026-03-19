import type { MaterialInfo, PurchaseOrder, PurchaseOrderItem } from '@/types/entity'

export interface EditablePurchaseItem {
  materialId: number | null
  purchaseQty: number | null
  unitPrice: number | null
  lineAmount: number
}

interface DraftPurchaseOrderEdit {
  id: number
  supplierId: number | null
  payMethod?: string
  remark?: string
  items: EditablePurchaseItem[]
}

interface DraftPurchaseOrderEditDeps {
  updatePurchase: (body: PurchaseOrder) => Promise<void>
  updatePurchaseItems: (orderId: number, body: PurchaseOrderItem[]) => Promise<void>
}

interface LatestPurchaseOrderStateOptions {
  currentOrder: PurchaseOrder | null
  latestOrders: PurchaseOrder[]
  latestItems: PurchaseOrderItem[]
}

export function mapPurchaseItemsToEditableItems(items: PurchaseOrderItem[]): EditablePurchaseItem[] {
  return items.map((item) => ({
    materialId: item.materialId ?? null,
    purchaseQty: item.purchaseQty ?? null,
    unitPrice: item.unitPrice ?? null,
    lineAmount: Number(item.lineAmount || 0),
  }))
}

export function getMaterialDefaultUnitPrice(
  materialId: number | null | undefined,
  materials: MaterialInfo[],
): number | null {
  if (materialId == null) {
    return null
  }

  const material = materials.find((item) => item.materialId === materialId)
  return material?.unitPrice ?? null
}

export function applyMaterialDefaultsToPurchaseItem(
  item: EditablePurchaseItem,
  materials: MaterialInfo[],
): EditablePurchaseItem {
  const defaultUnitPrice = getMaterialDefaultUnitPrice(item.materialId, materials)
  const unitPrice = defaultUnitPrice ?? item.unitPrice

  return {
    ...item,
    unitPrice,
    lineAmount: calculateLineAmount(item.purchaseQty, unitPrice),
  }
}

export function getLowStockPurchaseQuantity(
  item: Pick<MaterialInfo, 'safeThreshold' | 'currentStock'>,
): number {
  const safeThreshold = Number(item.safeThreshold || 0)
  const currentStock = Number(item.currentStock || 0)
  const targetStock = safeThreshold * 1.3
  const shortage = Math.ceil(targetStock - currentStock)
  return Math.max(1, shortage)
}

export function mapLowStockMaterialsToPurchaseItems(
  items: MaterialInfo[],
): EditablePurchaseItem[] {
  return items
    .filter((item) => item.materialId != null)
    .map((item) => {
      const purchaseQty = getLowStockPurchaseQuantity(item)
      const unitPrice = item.unitPrice != null ? Number(item.unitPrice) : null
      return {
        materialId: Number(item.materialId),
        purchaseQty,
        unitPrice,
        lineAmount: calculateLineAmount(purchaseQty, unitPrice),
      }
    })
}

export function toPurchaseOrderItemPayload(items: EditablePurchaseItem[]): PurchaseOrderItem[] {
  return items
    .filter((item) => item.materialId != null && item.purchaseQty != null && item.unitPrice != null)
    .map((item) => ({
      materialId: Number(item.materialId),
      purchaseQty: Number(item.purchaseQty),
      unitPrice: Number(item.unitPrice),
    }))
}

export async function saveDraftPurchaseOrderEdit(
  form: DraftPurchaseOrderEdit,
  deps: DraftPurchaseOrderEditDeps,
): Promise<void> {
  const payload: PurchaseOrder = {
    id: form.id,
    supplierId: form.supplierId != null ? Number(form.supplierId) : undefined,
    payMethod: trimToUndefined(form.payMethod),
    remark: trimToUndefined(form.remark),
  }

  await deps.updatePurchase(payload)
  await deps.updatePurchaseItems(form.id, toPurchaseOrderItemPayload(form.items))
}

export function getLatestPurchaseOrderState(
  options: LatestPurchaseOrderStateOptions,
): PurchaseOrder | null {
  const { currentOrder, latestOrders, latestItems } = options
  if (!currentOrder?.id) {
    return currentOrder
  }

  const refreshedOrder = latestOrders.find((order) => order.id === currentOrder.id)
  if (refreshedOrder) {
    return refreshedOrder
  }

  if (latestItems.length === 0) {
    return currentOrder
  }

  return {
    ...currentOrder,
    totalAmount: Number(
      latestItems
        .reduce((sum, item) => sum + Number(item.lineAmount || 0), 0)
        .toFixed(2),
    ),
  }
}

function trimToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function calculateLineAmount(
  purchaseQty: number | null | undefined,
  unitPrice: number | null | undefined,
): number {
  return Number(((purchaseQty || 0) * (unitPrice || 0)).toFixed(2))
}
