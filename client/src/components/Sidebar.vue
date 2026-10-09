<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <button class="toggle-btn" @click="toggleSidebar" title="Toggle sidebar">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 10H17M3 5H17M3 15H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div v-if="!isCollapsed" class="logo">
        <h1>{{ t('nav.companyName') }}</h1>
      </div>
    </div>

    <nav class="nav-items">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :title="item.label"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-if="!isCollapsed" class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="footer-item">
        <LanguageSwitcher />
      </div>
      <div class="footer-item">
        <ProfileMenu
          @show-profile-details="emit('show-profile-details')"
          @show-tasks="emit('show-tasks')"
        />
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ProfileMenu from './ProfileMenu.vue'

const { t } = useI18n()
const route = useRoute()
const isCollapsed = ref(false)

const emit = defineEmits(['collapse', 'show-profile-details', 'show-tasks'])

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  emit('collapse', isCollapsed.value)
}

const navItems = computed(() => [
  { path: '/', icon: '📊', label: t('nav.overview') },
  { path: '/inventory', icon: '📦', label: t('nav.inventory') },
  { path: '/orders', icon: '📋', label: t('nav.orders') },
  { path: '/spending', icon: '💰', label: t('nav.finance') },
  { path: '/demand', icon: '📈', label: t('nav.demandForecast') },
  { path: '/restocking', icon: '🔄', label: t('nav.restocking') },
  { path: '/reports', icon: '📄', label: t('nav.reports') }
])

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 100;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 70px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toggle-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

.logo {
  flex: 1;
  overflow: hidden;
}

.logo h1 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-items {
  flex: 1;
  padding: 1rem 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.938rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem;
}

.nav-item:hover {
  color: #0f172a;
  background: #f8fafc;
}

.nav-item.active {
  color: #3b82f6;
  background: #eff6ff;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #3b82f6;
  border-radius: 0 3px 3px 0;
}

.nav-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.nav-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 1rem 0.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-item {
  display: flex;
  justify-content: center;
}

.sidebar.collapsed .footer-item :deep(.language-button),
.sidebar.collapsed .footer-item :deep(.profile-button) {
  width: 40px;
  padding: 0.5rem;
  justify-content: center;
}

.sidebar.collapsed .footer-item :deep(.language-label),
.sidebar.collapsed .footer-item :deep(.profile-name),
.sidebar.collapsed .footer-item :deep(.chevron) {
  display: none;
}
</style>
