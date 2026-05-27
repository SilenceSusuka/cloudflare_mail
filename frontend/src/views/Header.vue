<script setup>
import { ref, h, computed, onMounted } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import { useIsMobile } from '../utils/composables'
import {
    DarkModeFilled, LightModeFilled, MenuFilled,
    AdminPanelSettingsFilled, MonitorHeartFilled,
    KeyboardArrowDownOutlined, OpenInNewOutlined
} from '@vicons/material'
import { GithubAlt, Language, User, Home } from '@vicons/fa'

import { useGlobalState } from '../store'
import { api } from '../api'
import { getRouterPathWithLang, hashPassword } from '../utils'
import { DEFAULT_LOCALE, isSupportedLocale, replaceLocaleInFullPath } from '../i18n/utils'
import { getLocaleLabel, SUPPORTED_LOCALES } from '../i18n/locale-registry'
import Turnstile from '../components/Turnstile.vue'
import { NButton, NIcon } from 'naive-ui'

const message = useMessage()
const notification = useNotification()

const {
    toggleDark, isDark, isTelegram, showAdminPage,
    showAuth, auth, loading, openSettings, preferredLocale, userSettings,
} = useGlobalState()
const route = useRoute()
const router = useRouter()
const isMobile = useIsMobile()

const isAdminRoute = computed(() => route.path.includes('/admin'))
const showKawaiiHeaderAccent = computed(
  () => !isDark.value && !isAdminRoute.value
)

const goHome = async () => {
  await router.push(getRouterPathWithLang('/', locale.value))
  showMobileMenu.value = false
}
const goUser = async () => {
  await router.push(getRouterPathWithLang('/user', locale.value))
  showMobileMenu.value = false
}
const goAdmin = async () => {
  loading.value = true
  try {
    await router.push(getRouterPathWithLang('/admin', locale.value))
  } finally {
    loading.value = false
    showMobileMenu.value = false
  }
}
const onToggleTheme = () => {
  toggleDark()
  showMobileMenu.value = false
}

const showMobileMenu = ref(false)
const menuValue = computed(() => {
    if (route.path.includes("user")) return "user";
    if (route.path.includes("admin")) return "admin";
    return "home";
});

const cfToken = ref('')
const turnstileRef = ref(null)

const authFunc = async () => {
    try {
        await api.fetch('/open_api/site_login', {
            method: 'POST',
            body: JSON.stringify({
                password: await hashPassword(auth.value),
                cf_token: cfToken.value
            })
        });
        location.reload()
    } catch (error) {
        message.error(error.message || "error");
        turnstileRef.value?.refresh?.();
    }
}

const languageOptions = SUPPORTED_LOCALES.map((locale) => ({
    label: getLocaleLabel(locale),
    value: locale,
    key: locale,
}))

const currentLocaleLabel = computed(() => {
    return languageOptions.find(opt => opt.value === locale.value)?.label || locale.value;
});

const { t, locale } = useScopedI18n('views.Header')

const changeLocale = async (lang) => {
    if (!isSupportedLocale(lang)) {
        return;
    }

    const currentFullPath = route.fullPath;
    const targetFullPath = replaceLocaleInFullPath(currentFullPath, lang);

    if (lang === locale.value && targetFullPath === currentFullPath) {
        showMobileMenu.value = false;
        return;
    }

    if (lang === DEFAULT_LOCALE) {
        preferredLocale.value = DEFAULT_LOCALE;
    }

    let localeSwitched = false;
    try {
        await router.push({ path: targetFullPath, force: true });
        localeSwitched = router.currentRoute.value.fullPath === targetFullPath;
        if (!localeSwitched) {
            await router.replace({ path: targetFullPath, force: true });
            localeSwitched = router.currentRoute.value.fullPath === targetFullPath;
        }
    } catch (error) {
        console.error('Failed to switch locale', error);
    } finally {
        showMobileMenu.value = false;
    }

    if (localeSwitched) preferredLocale.value = lang;
}

const version = import.meta.env.PACKAGE_VERSION ? `v${import.meta.env.PACKAGE_VERSION}` : "";
const showGithubForCurrentUser = computed(() => {
    if (!openSettings.value.showGithub) return false;
    if (openSettings.value.showGithubForUser) return true;
    return showAdminPage.value;
});

const menuOptions = computed(() => [
    {
        label: () => h(NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "home" ? "primary" : "default",
                style: "width: 100%",
                onClick: async () => {
                    await router.push(getRouterPathWithLang('/', locale.value));
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => t('home'),
                icon: () => h(NIcon, { component: Home })
            }),
        key: "home"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "user" ? "primary" : "default",
                style: "width: 100%",
                onClick: async () => {
                    await router.push(getRouterPathWithLang("/user", locale.value));
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => t('user'),
                icon: () => h(NIcon, { component: User }),
            }
        ),
        key: "user",
        show: !isTelegram.value
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "admin" ? "primary" : "default",
                style: "width: 100%",
                onClick: async () => {
                    loading.value = true;
                    await router.push(getRouterPathWithLang('/admin', locale.value));
                    loading.value = false;
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => "Admin",
                icon: () => h(NIcon, { component: AdminPanelSettingsFilled }),
            }
        ),
        show: showAdminPage.value,
        key: "admin"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                style: "width: 100%",
                onClick: () => { toggleDark(); showMobileMenu.value = false; }
            },
            {
                default: () => isDark.value ? t('light') : t('dark'),
                icon: () => h(
                    NIcon, { component: isDark.value ? LightModeFilled : DarkModeFilled }
                )
            }
        ),
        key: "theme"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                style: "width: 100%",
                tag: "a",
                target: "_blank",
                href: openSettings.value?.statusUrl,
            },
            {
                default: () => t('status'),
                icon: () => h(NIcon, { component: MonitorHeartFilled })
            }
        ),
        show: !!openSettings.value?.statusUrl,
        key: "status"
    }
]);

useHead({
    title: () => openSettings.value.title || t('title'),
    meta: [
        { name: "description", content: openSettings.value.description || t('title') },
    ]
});

const logoClickCount = ref(0);
const logoClick = async () => {
    if (route.path.includes("admin")) {
        logoClickCount.value = 0;
        return;
    }
    if (logoClickCount.value >= 5) {
        logoClickCount.value = 0;
        message.info("Change to admin Page");
        loading.value = true;
        await router.push(getRouterPathWithLang('/admin', locale.value));
        loading.value = false;
    } else {
        logoClickCount.value++;
    }
    if (logoClickCount.value > 0) {
        message.info(`Click ${5 - logoClickCount.value + 1} times to enter the admin page`);
    }
}

onMounted(async () => {
    await api.getOpenSettings(message, notification);
    // make sure user_id is fetched
    if (!userSettings.value.user_id) await api.getUserSettings(message);
});
</script>

<template>
    <div class="header-root">
        <header
            class="app-header"
            :class="{ 'app-header--admin': isAdminRoute, 'app-header--mobile': isMobile }"
        >
                <div class="app-header__brand">
                    <img src="/logo.png" alt="" class="brand-icon" @click="logoClick">
                    <div class="brand-text">
                        <div class="brand-title">{{ openSettings.title || t('title') }}</div>
                        <div class="brand-subtitle">{{ t('brandSubtitle') }}</div>
                    </div>
                </div>
                <nav v-if="!isMobile" class="top-nav" aria-label="Main">
                    <button
                        type="button"
                        class="top-nav__item"
                        :class="{ 'top-nav__item--active': menuValue === 'home' }"
                        @click="goHome"
                    >
                        <n-icon :component="Home" />
                        {{ t('home') }}
                    </button>
                    <button
                        v-if="!isTelegram"
                        type="button"
                        class="top-nav__item"
                        :class="{ 'top-nav__item--active': menuValue === 'user' }"
                        @click="goUser"
                    >
                        <n-icon :component="User" />
                        {{ t('user') }}
                    </button>
                    <button
                        v-if="showAdminPage"
                        type="button"
                        class="top-nav__item"
                        :class="{ 'top-nav__item--active': menuValue === 'admin' }"
                        @click="goAdmin"
                    >
                        <n-icon :component="AdminPanelSettingsFilled" />
                        Admin
                    </button>
                    <button type="button" class="top-nav__item" @click="onToggleTheme">
                        <n-icon :component="isDark ? LightModeFilled : DarkModeFilled" />
                        {{ isDark ? t('light') : t('dark') }}
                    </button>
                    <n-dropdown :options="languageOptions" @select="changeLocale" trigger="click">
                        <button type="button" class="top-nav__item">
                            <n-icon :component="Language" />
                            {{ currentLocaleLabel }}
                            <n-icon :component="KeyboardArrowDownOutlined" />
                        </button>
                    </n-dropdown>
                    <a
                        v-if="openSettings.statusUrl"
                        class="top-nav__item"
                        :href="openSettings.statusUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <n-icon :component="MonitorHeartFilled" />
                        {{ t('status') }}
                    </a>
                    <a
                        v-if="showGithubForCurrentUser"
                        class="top-nav__item"
                        href="https://github.com/dreamhunter2333/cloudflare_temp_email"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <n-icon :component="GithubAlt" />
                        GitHub
                    </a>
                    <span v-if="version" class="top-nav__version">{{ version }}</span>
                </nav>
                <n-button v-else quaternary @click="showMobileMenu = !showMobileMenu">
                    <template #icon>
                        <n-icon :component="MenuFilled" />
                    </template>
                    {{ t('menu') }}
                </n-button>
                <img
                    v-if="showKawaiiHeaderAccent && !isMobile"
                    src="/star.png"
                    alt=""
                    class="app-header__accent"
                >
        </header>
        <n-drawer v-model:show="showMobileMenu" placement="top" style="height: 100vh;">
            <n-drawer-content :title="t('menu')" closable>
                <n-menu :options="menuOptions" />
                <div class="mobile-menu-actions">
                    <n-dropdown :options="languageOptions" @select="changeLocale" trigger="click" class="header-locale-dropdown">
                        <button type="button" class="mobile-menu-utility-button">
                            <n-icon :component="Language" />
                            <span class="mobile-menu-action-label">{{ currentLocaleLabel }}</span>
                            <n-icon :component="KeyboardArrowDownOutlined" class="mobile-menu-action-arrow" />
                        </button>
                    </n-dropdown>
                    <a
                        v-if="showGithubForCurrentUser"
                        class="mobile-menu-utility-button"
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://github.com/dreamhunter2333/cloudflare_temp_email"
                    >
                        <n-icon :component="GithubAlt" />
                        <span class="mobile-menu-action-label">{{ version || 'Github' }}</span>
                        <n-icon :component="OpenInNewOutlined" class="mobile-menu-action-arrow" />
                    </a>
                </div>
            </n-drawer-content>
        </n-drawer>
        <n-modal v-model:show="showAuth" :closable="false" :closeOnEsc="false" :maskClosable="false" preset="dialog"
            :title="t('accessHeader')">
            <p>{{ t('accessTip') }}</p>
            <n-input v-model:value="auth" type="password" show-password-on="click" @keyup.enter="authFunc" />
            <Turnstile ref="turnstileRef" v-if="openSettings.enableGlobalTurnstileCheck" v-model:value="cfToken" />
            <template #action>
                <n-button :loading="loading" @click="authFunc" type="primary">
                    {{ t('ok') }}
                </n-button>
            </template>
        </n-modal>
    </div>
</template>

<style scoped>
.mobile-menu-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(128, 128, 128, 0.16);
}

.mobile-menu-utility-button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    width: 100%;
    min-width: 0;
    padding: 0 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: none;
    opacity: 0.82;
    cursor: pointer;
}

.mobile-menu-action-label {
    margin: 0 6px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mobile-menu-action-arrow {
    flex: 0 0 auto;
    margin-left: 2px;
}
</style>
