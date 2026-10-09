<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="budget-control">
        <div class="budget-header">
          <label class="budget-label">{{ t('restocking.budgetLabel') }}</label>
          <div class="budget-value">{{ currencySymbol }}{{ budget.toLocaleString() }}</div>
        </div>
        <input
          type="range"
          v-model.number="budget"
          min="0"
          max="100000"
          step="1000"
          class="budget-slider"
        />
        <div class="budget-hint">{{ t('restocking.budgetRange') }}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card info">
          <div class="stat-label">{{ t('restocking.totalItems') }}</div>
          <div class="stat-value">{{ recommendations.length }}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">{{ t('restocking.budgetUsed') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ totalBudgetUsed.toLocaleString() }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">{{ t('restocking.itemsSelected') }}</div>
          <div class="stat-value">{{ selectedItems.size }}</div>
        </div>
        <div class="stat-card primary">
          <div class="stat-label">{{ t('restocking.orderValue') }}</div>
          <div class="stat-value">{{ currencySymbol }}{{ selectedOrderValue.toLocaleString() }}</div>
        </div>
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.noRecommendations') }}</h3>
          <button
            class="place-order-btn"
            :disabled="selectedItems.size === 0"
            @click="handlePlaceOrder"
          >
            {{ t('restocking.placeOrder') }}
          </button>
        </div>
        <div v-if="recommendations.length === 0" class="no-data">
          {{ t('restocking.noItems') }}
        </div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th class="col-checkbox">{{ t('restocking.table.select') }}</th>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.itemName') }}</th>
                <th>{{ t('restocking.table.category') }}</th>
                <th>{{ t('restocking.table.warehouse') }}</th>
                <th>{{ t('restocking.table.currentStock') }}</th>
                <th>{{ t('restocking.table.reorderPoint') }}</th>
                <th>{{ t('restocking.table.forecastedDemand') }}</th>
                <th>{{ t('restocking.table.recommendedQty') }}</th>
                <th>{{ t('restocking.table.unitCost') }}</th>
                <th>{{ t('restocking.table.totalCost') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in recommendations" :key="item.id">
                <td class="col-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedItems.has(item.id)"
                    @change="toggleSelection(item.id)"
                    class="checkbox-input"
                  />
                </td>
                <td><strong>{{ item.sku }}</strong></td>
                <td>{{ translateProductName(item.name) }}</td>
                <td>{{ translateCategory(item.category) }}</td>
                <td>{{ translateWarehouse(item.warehouse) }}</td>
                <td>{{ item.currentStock }}</td>
                <td>{{ item.reorderPoint }}</td>
                <td><strong>{{ item.forecastedDemand }}</strong></td>
                <td><strong class="recommended-qty">{{ item.recommendedQuantity }}</strong></td>
                <td>{{ currencySymbol }}{{ item.unitCost.toFixed(2) }}</td>
                <td><strong>{{ currencySymbol }}{{ item.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useRestockingOrders } from '../composables/useRestockingOrders'
import { useI18n } from '../composables/useI18n'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency, translateProductName, translateWarehouse } = useI18n()
    const { addRestockingOrder } = useRestockingOrders()

    const currencySymbol = computed(() => {
      return currentCurrency.value === 'JPY' ? '¥' : '$'
    })

    const loading = ref(true)
    const error = ref(null)
    const budget = ref(50000)
    const demandForecasts = ref([])
    const inventoryData = ref([])
    const selectedItems = ref(new Set())
    const successMessage = ref('')

    const recommendations = computed(() => {
      // 1. Correlate demand forecasts with inventory by SKU
      const merged = demandForecasts.value.map(forecast => {
        const inv = inventoryData.value.find(i => i.sku === forecast.item_sku)
        if (!inv) return null

        // Calculate recommended quantity
        const deficit = Math.max(0, forecast.forecasted_demand - inv.quantity_on_hand)
        const needsReorder = inv.quantity_on_hand <= inv.reorder_point
        const recommendedQty = needsReorder
          ? Math.max(deficit, inv.reorder_point * 1.5)
          : deficit

        return {
          id: forecast.id,
          sku: forecast.item_sku,
          name: forecast.item_name,
          category: inv.category,
          warehouse: inv.location,
          currentStock: inv.quantity_on_hand,
          reorderPoint: inv.reorder_point,
          forecastedDemand: forecast.forecasted_demand,
          recommendedQuantity: Math.ceil(recommendedQty),
          unitCost: inv.unit_cost,
          totalCost: Math.ceil(recommendedQty) * inv.unit_cost
        }
      }).filter(item => item && item.recommendedQuantity > 0)

      // 2. Sort by forecasted demand DESC
      merged.sort((a, b) => b.forecastedDemand - a.forecastedDemand)

      // 3. Apply budget constraint
      const withinBudget = []
      let runningTotal = 0
      for (const item of merged) {
        if (runningTotal + item.totalCost <= budget.value) {
          withinBudget.push(item)
          runningTotal += item.totalCost
        }
      }
      return withinBudget
    })

    const totalBudgetUsed = computed(() => {
      return recommendations.value.reduce((sum, item) => sum + item.totalCost, 0)
    })

    const selectedOrderValue = computed(() => {
      return recommendations.value
        .filter(item => selectedItems.value.has(item.id))
        .reduce((sum, item) => sum + item.totalCost, 0)
    })

    const loadData = async () => {
      loading.value = true
      error.value = null
      try {
        const [forecasts, inventory] = await Promise.all([
          api.getDemandForecasts(),
          api.getInventory({})
        ])
        demandForecasts.value = forecasts
        inventoryData.value = inventory
      } catch (err) {
        error.value = 'Failed to load data: ' + err.message
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    const toggleSelection = (itemId) => {
      if (selectedItems.value.has(itemId)) {
        selectedItems.value.delete(itemId)
      } else {
        selectedItems.value.add(itemId)
      }
      // Trigger reactivity
      selectedItems.value = new Set(selectedItems.value)
    }

    const handlePlaceOrder = () => {
      if (selectedItems.value.size === 0) return

      const selectedRecommendations = recommendations.value.filter(item =>
        selectedItems.value.has(item.id)
      )

      const orderData = {
        items: selectedRecommendations.map(item => ({
          sku: item.sku,
          name: item.name,
          quantity: item.recommendedQuantity,
          unit_price: item.unitCost
        })),
        total_value: selectedOrderValue.value,
        warehouse: selectedRecommendations.length === 1 ? selectedRecommendations[0].warehouse : 'Multiple',
        category: selectedRecommendations.length === 1 ? selectedRecommendations[0].category : 'Multiple'
      }

      addRestockingOrder(orderData)

      // Show success message
      successMessage.value = t('restocking.orderPlaced')
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)

      // Clear selections
      selectedItems.value.clear()
      selectedItems.value = new Set()
    }

    const translateCategory = (category) => {
      const categoryMap = {
        'Circuit Boards': t('categories.circuitBoards'),
        'Sensors': t('categories.sensors'),
        'Actuators': t('categories.actuators'),
        'Controllers': t('categories.controllers'),
        'Power Supplies': t('categories.powerSupplies')
      }
      return categoryMap[category] || category
    }

    onMounted(loadData)

    return {
      t,
      loading,
      error,
      budget,
      recommendations,
      selectedItems,
      totalBudgetUsed,
      selectedOrderValue,
      successMessage,
      toggleSelection,
      handlePlaceOrder,
      currencySymbol,
      translateProductName,
      translateWarehouse,
      translateCategory
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin-bottom: 0.25rem;
}

.page-header p {
  color: #64748b;
  font-size: 0.875rem;
}

.budget-control {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.budget-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.budget-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.budget-slider {
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: #e2e8f0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  margin-bottom: 0.5rem;
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.budget-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.budget-hint {
  font-size: 0.813rem;
  color: #94a3b8;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.25rem;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card.info {
  border-left: 4px solid #3b82f6;
}

.stat-card.warning {
  border-left: 4px solid #f59e0b;
}

.stat-card.success {
  border-left: 4px solid #10b981;
}

.stat-card.primary {
  border-left: 4px solid #8b5cf6;
}

.stat-label {
  font-size: 0.813rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.success-message {
  background: #d1fae5;
  border: 1px solid #10b981;
  color: #065f46;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-weight: 500;
  text-align: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.place-order-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.place-order-btn:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.place-order-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
}

.no-data {
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.938rem;
}

.col-checkbox {
  width: 60px;
  text-align: center;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.recommended-qty {
  color: #3b82f6;
}

.loading,
.error {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.error {
  color: #ef4444;
}
</style>
