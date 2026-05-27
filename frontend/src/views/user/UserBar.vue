<script setup>
import { onMounted } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useGlobalState } from '../../store'
import { api } from '../../api'
import UserLogin from './UserLogin.vue'

const message = useMessage()

const {
    userSettings, userJwt, userOpenSettings
} = useGlobalState()

const { t } = useScopedI18n('views.user.UserBar')


onMounted(async () => {
    await api.getUserOpenSettings(message);
    // make sure user_id is fetched
    if (!userSettings.value.user_id) await api.getUserSettings(message);
});
</script>

<template>
    <div>
        <n-card :bordered="false" embedded v-if="!userSettings.fetched">
            <n-skeleton style="height: 50vh" />
        </n-card>
        <div v-else-if="userSettings.user_email" class="current-user-bar">
            <div class="current-user-bar__main">
                <span class="label">{{ t('currentUser') }}</span>
                <span class="email">{{ userSettings.user_email }}</span>
            </div>
        </div>
        <div v-else class="center">
            <n-card :bordered="false" embedded style="max-width: 600px;">
                <n-alert v-if="userJwt" type="warning" :show-icon="false" :bordered="false" closable>
                    <span>{{ t('fetchUserSettingsError') }}</span>
                </n-alert>
                <UserLogin />
            </n-card>
        </div>
    </div>
</template>

<style scoped>
.current-user-bar {
    box-sizing: border-box;
    margin: 14px 0;
    padding: 12px 18px;
    border-radius: 18px;
    background: linear-gradient(90deg, var(--accent-soft), var(--surface));
    border: 1px solid var(--border);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
}

.current-user-bar__main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
}

.current-user-bar .label {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.3;
}

.current-user-bar .email {
    color: var(--accent);
    font-weight: 600;
    font-size: 15px;
    line-height: 1.35;
    word-break: break-all;
}

.center {
    display: flex;
    text-align: center;
    place-items: center;
    justify-content: center;
    margin: 20px;
}
</style>
