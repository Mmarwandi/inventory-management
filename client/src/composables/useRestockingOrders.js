import { ref } from 'vue'

// Shared state for submitted restocking orders
const restockingOrders = ref([])
let nextOrderId = 1

export function useRestockingOrders() {
  function addRestockingOrder(orderData) {
    const now = new Date()
    const delivery = new Date(now)
    delivery.setDate(now.getDate() + 7)

    const order = {
      id: `restock-${Date.now()}-${nextOrderId}`,
      order_number: `RST-2026-${String(nextOrderId).padStart(4, '0')}`,
      order_date: now.toISOString().split('T')[0],
      expected_delivery: delivery.toISOString().split('T')[0],
      status: 'Processing',
      customer: 'Internal Restocking',
      items: orderData.items,
      total_value: orderData.total_value,
      warehouse: orderData.warehouse || 'Multiple',
      category: orderData.category || 'Multiple'
    }

    restockingOrders.value.push(order)
    nextOrderId++
    return order
  }

  function clearOrders() {
    restockingOrders.value = []
    nextOrderId = 1
  }

  return {
    submittedOrders: restockingOrders,
    addRestockingOrder,
    clearOrders
  }
}
