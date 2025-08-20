<script setup lang="ts">
import { reactive } from 'vue'

// @ts-expect-error: preload may inject getAppVersions into window.api
const versions = reactive({ ...(window.api.getAppVersions ? window.api.getAppVersions() : {}) })
</script>

<template>
  <ul class="versions">
    <li class="electron-version">Electron v{{ versions.electron }}</li>
    <li class="chrome-version">Chromium v{{ versions.chrome }}</li>
    <li class="node-version">Node v{{ versions.node }}</li>
  </ul>
</template>
