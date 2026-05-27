<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useScopedI18n } from '@/i18n/app'
import { useRouter } from 'vue-router'

import { useGlobalState } from '../store'
import { api } from '../api'
import { getRouterPathWithLang, hashPassword } from '../utils'
import Turnstile from '../components/Turnstile.vue'

import SenderAccess from './admin/SenderAccess.vue'
import Statistics from "./admin/Statistics.vue"
import SendBox from './admin/SendBox.vue';
import Account from './admin/Account.vue';
import CreateAccount from './admin/CreateAccount.vue';
import AccountSettings from './admin/AccountSettings.vue';
import UserManagement from './admin/UserManagement.vue';
import UserSettings from './admin/UserSettings.vue';
import UserOauth2Settings from './admin/UserOauth2Settings.vue';
import RoleAddressConfig from './admin/RoleAddressConfig.vue';
import Mails from './admin/Mails.vue';
import MailsUnknow from './admin/MailsUnknow.vue';
import About from './common/About.vue';
import Maintenance from './admin/Maintenance.vue';
import DatabaseManager from './admin/DatabaseManager.vue';
import Appearance from './common/Appearance.vue';
import Telegram from './admin/Telegram.vue';
import Webhook from './admin/Webhook.vue';
import MailWebhook from './admin/MailWebhook.vue';
import WorkerConfig from './admin/WorkerConfig.vue';
import IpBlacklistSettings from './admin/IpBlacklistSettings.vue';
import AiExtractSettings from './admin/AiExtractSettings.vue';

const {
  adminAuth, showAdminAuth, adminTab, loading,
  globalTabplacement, showAdminPage, userSettings,
  openSettings,
} = useGlobalState()
const message = useMessage()
const router = useRouter()

const SendMail = defineAsyncComponent(() => {
  loading.value = true;
  return import('./admin/SendMail.vue')
    .finally(() => loading.value = false);
});

const adminTabsNavIsVertical = computed(() => ['left', 'right'].includes(globalTabplacement.value))

const cfToken = ref('')
const turnstileRef = ref(null)

const authFunc = async () => {
  try {
    await api.fetch('/open_api/admin_login', {
      method: 'POST',
      body: JSON.stringify({
        password: await hashPassword(tmpAdminAuth.value),
        cf_token: cfToken.value
      })
    });
    adminAuth.value = tmpAdminAuth.value;
    location.reload()
  } catch (error) {
    message.error(error.message || "error");
    turnstileRef.value?.refresh?.();
  }
}

const showLogoutModal = ref(false)

const handleLogout = async () => {
  // 清空管理员认证
  adminAuth.value = '';
  // 重置管理员相关状态
  showAdminAuth.value = false;
  adminTab.value = 'account';
  // 显示成功提示并跳转
  message.success(t('logoutSuccess'));
  await router.push(getRouterPathWithLang('/', locale.value));
}

const { t, locale } = useScopedI18n('views.Admin')

const showAdminPasswordModal = computed(() => !showAdminPage.value || showAdminAuth.value)
const tmpAdminAuth = ref('')
// 判断是否通过 admin password 登录（而非用户管理员权限）
const isAdminPasswordLogin = computed(() => !!adminAuth.value)

// 获取当前登录方式
const currentLoginMethod = computed(() => {
  if (adminAuth.value) {
    return t('loginViaPassword');
  } else if (userSettings.value.is_admin) {
    return t('loginViaUserAdmin');
  } else if (openSettings.value.disableAdminPasswordCheck) {
    return t('loginViaDisabledCheck');
  }
  return '';
})

onMounted(async () => {
  // make sure openSettings is fetched for turnstile check
  if (!openSettings.value.fetched) await api.getOpenSettings(message);
  // make sure user_id is fetched
  if (!userSettings.value.user_id) await api.getUserSettings(message);
})
</script>

<template>
  <div v-if="userSettings.fetched" class="admin-page-root admin-page-root--themed">
    <n-modal v-model:show="showAdminPasswordModal" :closable="false" :closeOnEsc="false" :maskClosable="false"
      preset="dialog" :title="t('accessHeader')">
      <p>{{ t('accessTip') }}</p>
      <n-input v-model:value="tmpAdminAuth" type="password" show-password-on="click" />
      <Turnstile ref="turnstileRef" v-if="openSettings.enableGlobalTurnstileCheck" v-model:value="cfToken" />
      <template #action>
        <n-button @click="authFunc" type="primary" :loading="loading">
          {{ t('ok') }}
        </n-button>
      </template>
    </n-modal>
    <n-tabs v-if="showAdminPage" type="card" v-model:value="adminTab" :placement="globalTabplacement"
      :class="['admin-layout-shell', 'admin-root-tabs', { 'admin-layout-shell--vertical': adminTabsNavIsVertical }]">
      <n-tab-pane name="qucickSetup" :tab="t('qucickSetup')">
        <n-tabs class="admin-sub-tabs" type="bar" justify-content="start" animated>
          <n-tab-pane name="database" :tab="t('database')">
            <DatabaseManager />
          </n-tab-pane>
          <n-tab-pane name="account_settings" :tab="t('account_settings')">
            <AccountSettings />
          </n-tab-pane>
          <n-tab-pane name="user_settings" :tab="t('user_settings')">
            <UserSettings />
          </n-tab-pane>
          <n-tab-pane name="workerconfig" :tab="t('workerconfig')">
            <WorkerConfig />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="account" :tab="t('account')">
        <n-tabs class="admin-sub-tabs" type="bar" justify-content="start" animated>
          <n-tab-pane name="account" :tab="t('account')">
            <Account />
          </n-tab-pane>
          <n-tab-pane name="account_create" :tab="t('account_create')">
            <CreateAccount />
          </n-tab-pane>
          <n-tab-pane name="account_settings" :tab="t('account_settings')">
            <AccountSettings />
          </n-tab-pane>
          <n-tab-pane name="senderAccess" :tab="t('senderAccess')">
            <SenderAccess />
          </n-tab-pane>
          <n-tab-pane name="ipBlacklistSettings" :tab="t('ipBlacklistSettings')">
            <IpBlacklistSettings />
          </n-tab-pane>
          <n-tab-pane name="aiExtractSettings" :tab="t('aiExtractSettings')">
            <AiExtractSettings />
          </n-tab-pane>
          <n-tab-pane name="webhook" :tab="t('webhookSettings')">
            <Webhook />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="user" :tab="t('user')">
        <n-tabs class="admin-sub-tabs" type="bar" justify-content="start" animated>
          <n-tab-pane name="user_management" :tab="t('user_management')">
            <UserManagement />
          </n-tab-pane>
          <n-tab-pane name="user_settings" :tab="t('user_settings')">
            <UserSettings />
          </n-tab-pane>
          <n-tab-pane name="userOauth2Settings" :tab="t('userOauth2Settings')">
            <UserOauth2Settings />
          </n-tab-pane>
          <n-tab-pane name="roleAddressConfig" :tab="t('roleAddressConfig')">
            <RoleAddressConfig />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="mails" :tab="t('mails')">
        <n-tabs class="admin-sub-tabs" type="bar" justify-content="start" animated>
          <n-tab-pane name="mails" :tab="t('mails')">
            <Mails />
          </n-tab-pane>
          <n-tab-pane name="unknow" :tab="t('unknow')">
            <MailsUnknow />
          </n-tab-pane>
          <n-tab-pane name="sendBox" :tab="t('sendBox')">
            <SendBox />
          </n-tab-pane>
          <n-tab-pane name="sendMail" :tab="t('sendMail')">
            <SendMail />
          </n-tab-pane>
          <n-tab-pane name="mailWebhook" :tab="t('mailWebhook')">
            <MailWebhook />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="telegram" :tab="t('telegram')">
        <Telegram />
      </n-tab-pane>
      <n-tab-pane name="statistics" :tab="t('statistics')">
        <Statistics />
      </n-tab-pane>
      <n-tab-pane name="maintenance" :tab="t('maintenance')">
        <n-tabs class="admin-sub-tabs" type="bar" justify-content="start" animated>
          <n-tab-pane name="database" :tab="t('database')">
            <DatabaseManager />
          </n-tab-pane>
          <n-tab-pane name="workerconfig" :tab="t('workerconfig')">
            <WorkerConfig />
          </n-tab-pane>
          <n-tab-pane name="maintenance" :tab="t('maintenance')">
            <Maintenance />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="appearance" :tab="t('appearance')">
        <Appearance />
      </n-tab-pane>
      <n-tab-pane name="adminAccount" :tab="t('adminAccount')">
        <div style="display: flex; justify-content: center; padding: 20px;">
          <n-card style="width: 600px;">
            <n-space vertical>
              <n-text strong>{{ t('loginMethod') }}</n-text>
              <n-text>{{ currentLoginMethod }}</n-text>
              <n-divider v-if="isAdminPasswordLogin" />
              <n-button v-if="isAdminPasswordLogin" type="warning" @click="showLogoutModal = true" block>
                {{ t('logout') }}
              </n-button>
            </n-space>
          </n-card>
        </div>
      </n-tab-pane>
      <n-tab-pane name="about" :tab="t('about')">
        <About />
      </n-tab-pane>
    </n-tabs>
    <n-modal v-model:show="showLogoutModal" preset="dialog" :title="t('logoutConfirmTitle')">
      <p>{{ t('logoutConfirmContent') }}</p>
      <template #action>
        <n-button :loading="loading" @click="handleLogout" size="small" tertiary type="warning">
          {{ t('confirm') }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
/* 后台内层 Tab：整栏横向导航，窄屏可横向滚动，避免 Tab 被裁切 */
.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-nav) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  padding: 6px;
  margin: 0 0 14px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(61, 49, 56, 0.05);
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-nav-scroll-wrapper) {
  flex: 1;
  min-width: 0;
  overflow: visible;
}

.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-nav-scroll-content) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: min-content;
}

.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-tab) {
  flex-shrink: 0 !important;
  height: 40px !important;
  padding: 0 18px !important;
  border-radius: 14px !important;
  box-sizing: border-box;
  border: 1px solid transparent !important;
  background: transparent !important;
  font-weight: 500;
}

.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-tab:not(.n-tabs-tab--active):hover) {
  background: var(--surface-2) !important;
}

.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-tab--active) {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  border-color: var(--border-accent) !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}

.admin-layout-shell :deep(.admin-sub-tabs .n-tabs-bar) {
  display: none !important;
}

/* 仅外层后台主导航 Tab，避免与内层 admin-sub-tabs 混选 */
.admin-root-tabs.admin-layout-shell--vertical > :deep(.n-tabs-nav) {
  width: 170px;
  padding: 14px;
  border-radius: 22px;
  box-sizing: border-box;
}

.admin-page-root--themed .admin-root-tabs.admin-layout-shell--vertical > :deep(.n-tabs-nav) {
  background: var(--surface);
  border: 1px solid var(--border);
}

.admin-page-root--themed .admin-root-tabs.admin-layout-shell--vertical > :deep(.n-tabs-nav) .n-tabs-tab {
  border-radius: 14px !important;
  margin-bottom: 6px !important;
  justify-content: flex-start !important;
}

.admin-page-root--themed .admin-root-tabs.admin-layout-shell--vertical > :deep(.n-tabs-nav) .n-tabs-tab--active {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  font-weight: 600 !important;
}

.admin-page-root--themed .admin-root-tabs:not(.admin-layout-shell--vertical) > :deep(.n-tabs-nav) {
  padding: 10px 12px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  margin-bottom: 14px;
}

.admin-page-root--themed .admin-root-tabs:not(.admin-layout-shell--vertical) > :deep(.n-tabs-nav) .n-tabs-tab {
  border-radius: 999px !important;
}

.admin-page-root--themed .admin-root-tabs:not(.admin-layout-shell--vertical) > :deep(.n-tabs-nav) .n-tabs-tab--active {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  font-weight: 600 !important;
}

.n-pagination {
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>
