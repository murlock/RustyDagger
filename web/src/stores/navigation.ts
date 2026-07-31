import { defineStore } from 'pinia'
import { markRaw, type Component } from 'vue'

export interface ScreenProps {
  [key: string]: unknown
}

export interface ScreenEntry {
  component: Component
  props: ScreenProps
  home: ScreenEntry | null
  showStatus: boolean
}

interface GotoOptions {
  /** Overrides the default "return to whatever was current" home target. */
  home?: ScreenEntry | null
  /** Mirrors Screen's `status` field (true by default; hideStatusBar() sets it false). */
  showStatus?: boolean
}

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    current: null as ScreenEntry | null,
  }),
  getters: {
    currentComponent: (state) => state.current?.component ?? null,
    currentProps: (state) => state.current?.props ?? {},
    showStatusBar: (state) => state.current?.showStatus ?? false,
  },
  actions: {
    goto(component: Component, props: ScreenProps = {}, opts: GotoOptions = {}) {
      this.current = {
        component: markRaw(component),
        props,
        home: opts.home !== undefined ? opts.home : this.current,
        showStatus: opts.showStatus ?? true,
      }
    },
    goHome() {
      if (this.current?.home) {
        this.current = this.current.home
      }
    },
  },
})
