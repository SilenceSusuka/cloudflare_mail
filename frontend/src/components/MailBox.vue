<script setup>
import { watch, onMounted, ref, onBeforeUnmount, computed } from "vue";
import { useMessage } from 'naive-ui'
import { useScopedI18n } from '@/i18n/app'
import { useGlobalState } from '../store'
import { CloudDownloadRound, ArrowBackIosNewFilled, ArrowForwardIosFilled, InboxRound } from '@vicons/material'
import { useIsMobile } from '../utils/composables'
import { processItem } from '../utils/email-parser'
import { utcToLocalDate } from '../utils';
import { buildReplyModel, buildForwardModel } from '../utils/mail-actions'
import MailContentRenderer from "./MailContentRenderer.vue";

const message = useMessage()
const isMobile = useIsMobile()

const props = defineProps({
  enableUserDeleteEmail: {
    type: Boolean,
    default: false,
    required: false
  },
  showEMailTo: {
    type: Boolean,
    default: true,
    required: false
  },
  /** 后台等场景下列表栏最小占比（与邮箱设置取 max，约 0.36 ≈ 360px+） */
  listPaneMinRatio: {
    type: Number,
    default: undefined,
    required: false
  },
  fetchMailData: {
    type: Function,
    default: () => { },
    required: true
  },
  deleteMail: {
    type: Function,
    default: () => { },
    required: false
  },
  showReply: {
    type: Boolean,
    default: false,
    required: false
  },
  showSaveS3: {
    type: Boolean,
    default: false,
    required: false
  },
  saveToS3: {
    type: Function,
    default: (mail_id, filename, blob) => { },
    required: false
  },
  showFilterInput: {
    type: Boolean,
    default: false,
    required: false
  },
})

const localFilterKeyword = ref('')

const {
  isDark, mailboxSplitSize, indexTab, loading, useUTCDate,
  autoRefresh, configAutoRefreshInterval, sendMailModel,
} = useGlobalState()

const effectiveSplitRatio = computed(() => {
  const min = props.listPaneMinRatio
  if (typeof min === 'number' && !Number.isNaN(min)) {
    return Math.max(mailboxSplitSize.value, min)
  }
  return mailboxSplitSize.value
})

const listSummaryLine = (row) => {
  const from = (row.source || '').trim() || '—'
  if (!props.showEMailTo) return from
  const to = (row.address || '').trim()
  if (!to) return from
  return `${from} · ${to}`
}

const autoRefreshInterval = ref(configAutoRefreshInterval.value)
const rawData = ref([])
const timer = ref(null)

const count = ref(0)
const page = ref(1)
const pageSize = ref(20)

// Computed property for filtered data (only filter current page)
const data = computed(() => {
  if (!localFilterKeyword.value || localFilterKeyword.value.trim() === '') {
    return rawData.value;
  }
  const keyword = localFilterKeyword.value.toLowerCase();
  return rawData.value.filter(mail => {
    // Search in subject, text, message fields
    const searchFields = [
      mail.subject || '',
      mail.text || '',
      mail.message || ''
    ].map(field => field.toLowerCase());
    return searchFields.some(field => field.includes(keyword));
  });
})

const canGoPrevMail = computed(() => {
  if (!curMail.value) return false
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)
  return currentIndex > 0 || page.value > 1
})

const canGoNextMail = computed(() => {
  if (!curMail.value) return false
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)
  return currentIndex < data.value.length - 1 || count.value > page.value * pageSize.value
})

const prevMail = async () => {
  if (!canGoPrevMail.value) return
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)

  if (currentIndex > 0) {
    curMail.value = data.value[currentIndex - 1]
  } else if (page.value > 1) {
    page.value--
    await refresh()
    if (data.value.length > 0) {
      curMail.value = data.value[data.value.length - 1]
    }
  }
}

const nextMail = async () => {
  if (!canGoNextMail.value) return
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)

  if (currentIndex < data.value.length - 1) {
    curMail.value = data.value[currentIndex + 1]
  } else if (count.value > page.value * pageSize.value) {
    page.value++
    await refresh()
    if (data.value.length > 0) {
      curMail.value = data.value[0]
    }
  }
}

const curMail = ref(null);

const multiActionMode = ref(false)
const showMultiActionDownload = ref(false)
const showMultiActionDelete = ref(false)
const multiActionDownloadZip = ref({})
const multiActionDeleteProgress = ref({ percentage: 0, tip: '0/0' })

const { t } = useScopedI18n('components.MailBox')

const setupAutoRefresh = async (autoRefresh) => {
  // auto refresh every configAutoRefreshInterval seconds
  autoRefreshInterval.value = configAutoRefreshInterval.value;
  if (autoRefresh) {
    clearInterval(timer.value);
    timer.value = setInterval(async () => {
      if (loading.value) return;
      autoRefreshInterval.value--;
      if (autoRefreshInterval.value <= 0) {
        autoRefreshInterval.value = configAutoRefreshInterval.value;
        await backFirstPageAndRefresh();
      }
    }, 1000)
  } else {
    clearInterval(timer.value)
    timer.value = null
  }
}

watch(autoRefresh, async (autoRefresh, old) => {
  setupAutoRefresh(autoRefresh)
}, { immediate: true })

watch([page, pageSize], async ([page, pageSize], [oldPage, oldPageSize]) => {
  if (page !== oldPage || pageSize !== oldPageSize) {
    await refresh();
  }
})

const refresh = async () => {
  try {
    const { results, count: totalCount } = await props.fetchMailData(
      pageSize.value, (page.value - 1) * pageSize.value
    );
    loading.value = true;
    rawData.value = await Promise.all(results.map(async (item) => {
      item.checked = false;
      return await processItem(item);
    }));
    if (totalCount > 0) {
      count.value = totalCount;
    }
    curMail.value = null;
    if (!isMobile.value && data.value.length > 0) {
      curMail.value = data.value[0];
    }
  } catch (error) {
    message.error(error.message || "error");
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const backFirstPageAndRefresh = async () => {
  page.value = 1;
  await refresh();
}

const clickRow = async (row) => {
  if (multiActionMode.value) {
    row.checked = !row.checked;
    return;
  }
  curMail.value = row;
};


const mailItemClass = (row) => {
  const active = curMail.value && row.id === curMail.value.id
  if (!active) return ''
  if (isDark.value) {
    return 'overlay overlay-dark-backgroud'
  }
  return 'mail-list-row-active'
}

const deleteMail = async () => {
  try {
    await props.deleteMail(curMail.value.id);
    message.success(t("success"));
    curMail.value = null;
    await refresh();
  } catch (error) {
    message.error(error.message || "error");
  }
};

const replyMail = async () => {
  Object.assign(sendMailModel.value, buildReplyModel(curMail.value, t('reply')));
  indexTab.value = 'sendmail';
};

const forwardMail = async () => {
  Object.assign(sendMailModel.value, buildForwardModel(curMail.value, t('forwardMail')));
  indexTab.value = 'sendmail';
};

const onSpiltSizeChange = (size) => {
  mailboxSplitSize.value = size;
}

const saveToS3Proxy = async (filename, blob) => {
  await props.saveToS3(curMail.value.id, filename, blob);
}

const multiActionModeClick = (enableMulti) => {
  if (enableMulti) {
    data.value.forEach((item) => {
      item.checked = false;
    });
    multiActionMode.value = true;
  } else {
    multiActionMode.value = false;
    data.value.forEach((item) => {
      item.checked = false;
    });
  }
}

const multiActionSelectAll = (checked) => {
  data.value.forEach((item) => {
    item.checked = checked;
  });
}

const multiActionDeleteMail = async () => {
  try {
    loading.value = true;
    const selectedMails = data.value.filter((item) => item.checked);
    if (selectedMails.length === 0) {
      message.error(t('pleaseSelectMail'));
      return;
    }
    multiActionDeleteProgress.value = {
      percentage: 0,
      tip: `0/${selectedMails.length}`
    };
    for (const [index, mail] of selectedMails.entries()) {
      await props.deleteMail(mail.id);
      showMultiActionDelete.value = true;
      multiActionDeleteProgress.value = {
        percentage: Math.floor((index + 1) / selectedMails.length * 100),
        tip: `${index + 1}/${selectedMails.length}`
      };
    }
    message.success(t("success"));
    await refresh();
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    loading.value = false;
    showMultiActionDelete.value = true;
  }
}

const multiActionDownload = async () => {
  try {
    loading.value = true;
    const selectedMails = data.value.filter((item) => item.checked);
    if (selectedMails.length === 0) {
      message.error(t('pleaseSelectMail'));
      return;
    }
    const JSZipModlue = await import('jszip');
    const JSZip = JSZipModlue.default;
    const zip = new JSZip();
    for (const mail of selectedMails) {
      zip.file(`${mail.id}.eml`, mail.raw);
    }
    multiActionDownloadZip.value = {
      url: URL.createObjectURL(await zip.generateAsync({ type: "blob" })),
      filename: `mails-${new Date().toISOString().replace(/:/g, '-')}.zip`
    }
    showMultiActionDownload.value = true;
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refresh();
});

onBeforeUnmount(() => {
  clearInterval(timer.value)
})
</script>

<template>
  <div>
    <div v-if="!isMobile" class="left">
      <div style="margin-bottom: 10px;">
        <n-space v-if="multiActionMode" align="center">
          <n-button @click="multiActionModeClick(false)" tertiary>
            {{ t('cancelMultiAction') }}
          </n-button>
          <n-button @click="multiActionSelectAll(true)" tertiary>
            {{ t('selectAll') }}
          </n-button>
          <n-button @click="multiActionSelectAll(false)" tertiary>
            {{ t('unselectAll') }}
          </n-button>
          <n-popconfirm v-if="enableUserDeleteEmail" @positive-click="multiActionDeleteMail">
            <template #trigger>
              <n-button tertiary type="error">{{ t('delete') }}</n-button>
            </template>
            {{ t('deleteMailTip') }}
          </n-popconfirm>
          <n-button @click="multiActionDownload" tertiary type="info">
            <template #icon>
              <n-icon :component="CloudDownloadRound" />
            </template>
            {{ t('downloadMail') }}
          </n-button>
        </n-space>
        <n-space v-else align="center" :wrap="true">
          <n-button @click="multiActionModeClick(true)" type="primary" tertiary>
            {{ t('multiAction') }}
          </n-button>
          <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" :page-sizes="[20, 50, 100]"
            show-size-picker />
          <label class="refresh-switch">
            <span class="refresh-switch__track">
              <input v-model="autoRefresh" type="checkbox" class="refresh-switch__input">
              <span class="refresh-switch__slider" aria-hidden="true" />
            </span>
            <span class="refresh-switch__text">{{
              autoRefresh ? t('refreshAfter', { msg: autoRefreshInterval }) : t('autoRefresh')
            }}</span>
          </label>
          <n-button @click="backFirstPageAndRefresh" type="primary" tertiary>
            {{ t('refresh') }}
          </n-button>
          <n-input v-if="showFilterInput" v-model:value="localFilterKeyword"
            :placeholder="t('keywordQueryTip')" style="width: 200px; display: flex; align-items: center;"
            clearable />
        </n-space>
      </div>
      <n-split class="left mail-split" direction="horizontal" :max="0.75" :min="0.25" :default-size="effectiveSplitRatio"
        :on-update:size="onSpiltSizeChange">
        <template #1>
          <div
            class="mail-list-panel"
            :class="{ 'mail-list-panel--watermark': !isDark }"
            style="min-height: 60vh; max-height: 100vh;"
          >
            <n-list hoverable clickable class="mail-list-inner">
              <n-list-item v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)"
                :class="mailItemClass(row)">
                <template #prefix v-if="multiActionMode">
                  <n-checkbox v-model:checked="row.checked" />
                </template>
                <div class="mail-list-entry">
                  <div class="mail-list-subject">{{ row.subject || '—' }}</div>
                  <div class="mail-list-summary">
                    <div class="mail-list-from">{{ listSummaryLine(row) }}</div>
                    <div class="mail-list-time">{{ utcToLocalDate(row.created_at, useUTCDate) }}</div>
                  </div>
                </div>
              </n-list-item>
            </n-list>
          </div>
        </template>
        <template #2>
          <div class="mail-detail-panel">
            <div
              class="mail-detail-card"
              :class="{ 'mail-detail--kawaii': !isDark }"
            >
              <div v-if="curMail" class="mail-detail-toolbar">
                <n-flex justify="space-between">
                  <n-button @click="prevMail" :disabled="!canGoPrevMail" text size="small">
                    <template #icon>
                      <n-icon>
                        <ArrowBackIosNewFilled />
                      </n-icon>
                    </template>
                    {{ t('prevMail') }}
                  </n-button>
                  <n-button @click="nextMail" :disabled="!canGoNextMail" text size="small" icon-placement="right">
                    <template #icon>
                      <n-icon>
                        <ArrowForwardIosFilled />
                      </n-icon>
                    </template>
                    {{ t('nextMail') }}
                  </n-button>
                </n-flex>
              </div>
              <div class="mail-detail-body">
                <n-card :bordered="false" embedded v-if="curMail" class="mail-item" :title="curMail.subject"
                  style="overflow: auto; max-height: 100vh;">
                  <MailContentRenderer :mail="curMail" :showEMailTo="showEMailTo"
                    :enableUserDeleteEmail="enableUserDeleteEmail" :showReply="showReply" :showSaveS3="showSaveS3"
                    :onDelete="deleteMail" :onReply="replyMail" :onForward="forwardMail" :onSaveToS3="saveToS3Proxy" />
                </n-card>
                <n-card :bordered="false" embedded class="mail-item" v-else>
                  <n-result status="info" :title="count === 0 ? t('emptyInbox') : t('pleaseSelectMail')">
                    <template #icon>
                      <n-icon :component="InboxRound" :size="100" />
                    </template>
                  </n-result>
                </n-card>
              </div>
            </div>
          </div>
        </template>
      </n-split>
    </div>
    <div class="left" v-else>
      <n-space justify="space-around" align="center" :wrap="true" style="display: flex; align-items: center; gap: 8px;">
        <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" simple size="small" />
        <label class="refresh-switch refresh-switch--compact">
          <span class="refresh-switch__track">
            <input v-model="autoRefresh" type="checkbox" class="refresh-switch__input">
            <span class="refresh-switch__slider" aria-hidden="true" />
          </span>
          <span class="refresh-switch__text">{{
            autoRefresh ? t('refreshAfter', { msg: autoRefreshInterval }) : t('autoRefresh')
          }}</span>
        </label>
        <n-button @click="backFirstPageAndRefresh" tertiary size="small" type="primary">
          {{ t('refresh') }}
        </n-button>
      </n-space>
      <div v-if="showFilterInput" style="padding: 0 10px; margin-top: 8px; margin-bottom: 10px;">
        <n-input v-model:value="localFilterKeyword"
          :placeholder="t('keywordQueryTip')" size="small" clearable />
      </div>
          <div class="mail-list-panel mail-list-panel--mobile-scroll" style="min-height: 60vh; max-height: 100vh;">
        <n-list hoverable clickable class="mail-list-inner">
          <n-list-item v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)">
            <div class="mail-list-entry">
              <div class="mail-list-subject">{{ row.subject || '—' }}</div>
              <div class="mail-list-summary">
                <div class="mail-list-from">{{ listSummaryLine(row) }}</div>
                <div class="mail-list-time">{{ utcToLocalDate(row.created_at, useUTCDate) }}</div>
              </div>
            </div>
          </n-list-item>
        </n-list>
      </div>
      <n-drawer v-model:show="curMail" width="100%" placement="bottom" :trap-focus="false" :block-scroll="false"
        style="height: 80vh;">
        <n-drawer-content :title="curMail ? curMail.subject : ''" closable>
          <div class="mail-detail-panel">
            <div
              class="mail-detail-card"
              :class="{ 'mail-detail--kawaii': !isDark }"
            >
              <div class="mail-detail-body">
                <n-card :bordered="false" embedded style="overflow: auto;">
                  <MailContentRenderer :mail="curMail" :showEMailTo="showEMailTo"
                    :enableUserDeleteEmail="enableUserDeleteEmail" :showReply="showReply" :showSaveS3="showSaveS3"
                    :useUTCDate="useUTCDate" :onDelete="deleteMail" :onReply="replyMail" :onForward="forwardMail"
                    :onSaveToS3="saveToS3Proxy" />
                </n-card>
              </div>
            </div>
          </div>
        </n-drawer-content>
      </n-drawer>
    </div>
    <n-modal v-model:show="showMultiActionDownload" preset="dialog" :title="t('downloadMail')">
      <span class="meta-pill">
        {{ multiActionDownloadZip.filename }}
      </span>
      <n-button tag="a" target="_blank" tertiary type="info" size="small" :download="multiActionDownloadZip.filename"
        :href="multiActionDownloadZip.url">
        <n-icon :component="CloudDownloadRound" />
        {{ t('downloadMail') + " zip" }}
      </n-button>
    </n-modal>
    <n-modal v-model:show="showMultiActionDelete" preset="dialog" :title="t('delete') + t('success')"
      negative-text="OK">
      <n-space justify="center">
        <n-progress type="circle" status="error" :percentage="multiActionDeleteProgress.percentage">
          <span style="text-align: center">
            {{ multiActionDeleteProgress.tip }}
          </span>
        </n-progress>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.left {
  text-align: left;
}

.mail-split {
  min-width: 0;
}

.mail-split :deep(.n-split-pane-1),
.mail-split :deep(.n-split-pane-2) {
  min-width: 0 !important;
  overflow: hidden;
}

.mail-detail-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.mail-list-panel {
  overflow-x: hidden;
  overflow-y: auto;
  min-width: 0;
}

.mail-list-inner {
  min-width: 0;
}

.mail-list-entry {
  min-width: 0;
  width: 100%;
}

.mail-list-subject {
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  color: var(--text, #3d3138);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.mail-list-summary {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-soft, #8c7a84);
  min-width: 0;
}

.mail-list-from {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 100%;
}

.mail-list-time {
  color: var(--accent, #e66a9b);
}

:deep(.mail-list-inner .n-list-item) {
  min-width: 0;
}

:deep(.mail-list-inner .n-list-item__main) {
  min-width: 0;
  overflow: hidden;
}

.refresh-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  box-sizing: border-box;
  flex-shrink: 0;
  max-width: min(280px, 100%);
}

.refresh-switch--compact {
  height: 32px;
  padding: 0 8px;
  font-size: 12px;
  max-width: min(240px, 46vw);
}

.refresh-switch__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refresh-switch__track {
  position: relative;
  width: 34px;
  height: 20px;
  flex-shrink: 0;
}

.refresh-switch__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  z-index: 1;
}

.refresh-switch__slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--surface-3);
  transition: background 0.2s ease;
  cursor: pointer;
}

.refresh-switch__slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  transition: transform 0.2s ease;
}

.refresh-switch__input:focus-visible + .refresh-switch__slider {
  outline: 2px solid var(--accent, #e66a9b);
  outline-offset: 2px;
}

.refresh-switch__input:checked + .refresh-switch__slider {
  background: var(--accent, #e66a9b);
}

.refresh-switch__input:checked + .refresh-switch__slider::before {
  transform: translateX(14px);
}

.center {
  text-align: center;
}

.mail-list-panel--mobile-scroll {
  overflow-x: hidden;
  overflow-y: auto;
  min-width: 0;
}

.overlay {
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.overlay-dark-backgroud {
  background-color: rgba(255, 255, 255, 0.1);
}

.overlay-light-backgroud {
  background-color: rgba(0, 0, 0, 0.1);
}

.mail-item {
  height: 100%;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
