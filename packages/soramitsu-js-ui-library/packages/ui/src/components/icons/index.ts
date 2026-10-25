import type { Component } from 'vue'
import type { Status } from '@/types'

// This module is a proxy to soramitsu brand icons

import IconClose from '@soramitsu-ui/icons/icomoon/basic-close-24.svg'
import IconStatusSuccess from '@soramitsu-ui/icons/icomoon/basic-circle-checked-24.svg'
import IconStatusInfo from '@soramitsu-ui/icons/icomoon/notifications-info-24.svg'
import IconStatusWarning from '@soramitsu-ui/icons/icomoon/notifications-alert-triangle-24.svg'
import IconStatusError from '@soramitsu-ui/icons/icomoon/notifications-x-octagon-24.svg'

// Warning16 icon is missing :<
// I've picked the most similar icon instead of it
// FIXME
import IconStatusWarning16 from '~icons/ri/alert-fill'

import IconStatusSuccess16 from '@soramitsu-ui/icons/icomoon/status-success-clr-16.svg'
import IconStatusError16 from '@soramitsu-ui/icons/icomoon/status-error-ic-16.svg'

import IconArrowTop16 from '@soramitsu-ui/icons/icomoon/arrow-top-16.svg'
import IconArrowRight16 from '@soramitsu-ui/icons/icomoon/arrow-right-16.svg'

import IconArrowsChevronRightXs24 from '@soramitsu-ui/icons/icomoon/arrows-chevron-right-xs-24.svg'
import IconArrowsChevronLeftXs24 from '@soramitsu-ui/icons/icomoon/arrows-chevron-left-xs-24.svg'
import IconChevronsRight16 from '@soramitsu-ui/icons/icomoon/chevrons-right-16.svg'
import IconChevronsLeft16 from '@soramitsu-ui/icons/icomoon/chevrons-left-16.svg'

// BROKEN
// import IconBasicEye24 from '@soramitsu-ui/icons/icomoon/basic-eye-24.svg'
// import IconBasicEyeNo24 from '@soramitsu-ui/icons/icomoon/basic-eye-no-24.svg'

// TODO(see docs/backlog.md#icons) update design system once official assets arrive
import IconEye from '~icons/majesticons/eye-line'
import IconEyeOff from '~icons/majesticons/eye-off-line'

import IconArrowsChevronDownRounded24 from '@soramitsu-ui/icons/icomoon/arrows-chevron-down-rounded-24.svg'
import IconArrowsChevronRight24 from '@soramitsu-ui/icons/icomoon/arrows-chevron-right-24.svg'
import IconArrowsChevronLeft24 from '@soramitsu-ui/icons/icomoon/arrows-chevron-left-24.svg'
import IconArrowsChevronBottom24 from '@soramitsu-ui/icons/icomoon/arrows-chevron-bottom-24.svg'
import IconBasicCheckMark24 from '@soramitsu-ui/icons/icomoon/basic-check-mark-24.svg'

import IconChevronBottom16 from '@soramitsu-ui/icons/icomoon/chevron-bottom-16.svg'
import IconBasicExternalLink24 from '@soramitsu-ui/icons/icomoon/basic-external-link-24.svg'

import IconBasicSearch24 from '@soramitsu-ui/icons/icomoon/basic-search-24.svg'
import IconQuestion from '@soramitsu-ui/icons/icomoon/notifications-question-circle-24.svg'
import IconCopy from '@soramitsu-ui/icons/icomoon/basic-copy-24.svg'

export {
  IconClose,
  IconStatusError,
  IconStatusWarning,
  IconStatusSuccess,
  IconStatusInfo,
  IconStatusError16,
  IconStatusSuccess16,
  IconStatusWarning16,
  IconEye,
  IconEyeOff,
  IconArrowsChevronDownRounded24,
  IconArrowsChevronRight24,
  IconArrowsChevronLeft24,
  IconBasicCheckMark24,
  IconArrowsChevronBottom24,
  IconChevronBottom16,
  IconBasicExternalLink24,
  IconArrowTop16,
  IconArrowRight16,
  IconArrowsChevronRightXs24,
  IconArrowsChevronLeftXs24,
  IconChevronsRight16,
  IconChevronsLeft16,
  IconBasicSearch24,
  IconQuestion,
  IconCopy,
}

export const STATUS_ICONS_MAP: Record<Status, Component> = {
  info: IconStatusInfo,
  warning: IconStatusWarning,
  error: IconStatusError,
  success: IconStatusSuccess,
}

/**
 * TODO(see docs/backlog.md#icons) append info icon once supplied; STextField currently doesn’t
 * need "info" entry here
 */
export const STATUS_ICONS_MAP_16: Record<Exclude<Status, 'info'>, Component> = {
  warning: IconStatusWarning16,
  error: IconStatusError16,
  success: IconStatusSuccess16,
}
