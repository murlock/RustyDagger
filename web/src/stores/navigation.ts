import { defineStore } from 'pinia'
import { markRaw, type Component } from 'vue'

interface ScreenEntry {
  component: Component
  home: ScreenEntry | null
}

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    current: null as ScreenEntry | null,
  }),
  getters: {
    currentComponent: (state) => state.current?.component ?? null,
  },
  actions: {
    goto(component: Component, home?: ScreenEntry | null) {
      this.current = { component: markRaw(component), home: home ?? this.current }
    },
    goHome() {
      if (this.current?.home) {
        this.current = this.current.home
      }
    },
  },
})
