'use strict';
const { MovementType } = require('@prisma/client');
const { AppError } = require('../utils/http');

// The only service that changes stock. Call inside an existing interactive transaction.
async function changeStock(tx, { productId, delta, type, reason, userId = null, orderId = null, reference = null }) {
  if (!Number.isSafeInteger(delta) || delta === 0) throw new AppError(400, 'INVALID_QUANTITY', 'Stock change must be a non-zero integer');
  const before = await tx.product.findUnique({ where: { id: productId }, select: { stockQuantity: true } });
  if (!before) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  const result = await tx.product.updateMany({
    where: { id: productId, ...(delta < 0 ? { stockQuantity: { gte: -delta } } : {}) },
    data: { stockQuantity: { increment: delta } }
  });
  if (result.count !== 1) throw new AppError(409, 'INSUFFICIENT_STOCK', 'Available stock is insufficient');
  const after = before.stockQuantity + delta;
  await tx.inventoryMovement.create({ data: {
    productId, userId, orderId, type: type || (delta > 0 ? MovementType.STOCK_IN : MovementType.STOCK_OUT),
    quantity: delta, stockBefore: before.stockQuantity, stockAfter: after, reason, reference
  } });
  return { before: before.stockQuantity, after };
}
module.exports = { changeStock };
