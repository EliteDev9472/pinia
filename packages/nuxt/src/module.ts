/**
 * @module @pinia/nuxt
 */
import {
  defineNuxtModule,
  addPlugin,
  isNuxt2,
  addImports,
  createResolver,
  resolveModule,
  addImportsDir,
} from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'

export interface ModuleOptions {
  /**
   * Pinia disables Vuex by default, set this option to `false` to avoid it and
   * use Pinia alongside Vuex (Nuxt 2 only)
   *
   * @default `true`
   */
  disableVuex?: boolean

  /**
   * Automatically add stores dirs to the auto imports. This is the same as
   * directly adding the dirs to the `imports.dirs` option.
   *
   * @default `['./stores']`
   */
  storesDirs?: string[]
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'pinia',
    configKey: 'pinia',
    compatibility: {
      nuxt: '^2.0.0 || ^3.0.0-rc.5',
      bridge: true,
    },
  },
  defaults: {
    disableVuex: true,
    storesDirs: ['./stores'],
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Disable default Vuex store (Nuxt v2.10+ only)
    if (
      // @ts-expect-error: no feature flag anymore or private?
      nuxt.options.features &&
      // ts
      options.disableVuex &&
      isNuxt2()
    ) {
      // @ts-expect-error: same
      nuxt.options.features.store = false
    }

    // Transpile runtime
    nuxt.options.build.transpile.push(resolver.resolve('./runtime'))

    // Make sure we use the mjs build for pinia
    nuxt.options.alias.pinia =
      nuxt.options.alias.pinia ||
      // FIXME: remove this deprecated call. Ensure it works in Nuxt 2 to 3
      resolveModule('pinia/dist/pinia.mjs', {
        paths: [nuxt.options.rootDir, import.meta.url],
      })

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ types: '@pinia/nuxt' })
    })

    // Add runtime plugin before the router plugin
    // https://github.com/nuxt/framework/issues/9130
    nuxt.hook('modules:done', () => {
      if (isNuxt2()) {
        addPlugin(resolver.resolve('./runtime/plugin.vue2'))
      } else {
        addPlugin(resolver.resolve('./runtime/plugin.vue3'))
      }
    })

    // Add auto imports
    const composables = resolver.resolve('./runtime/composables')
    addImports([
      { from: composables, name: 'defineStore' },
      { from: composables, name: 'acceptHMRUpdate' },
      { from: composables, name: 'usePinia' },
    ])

    if (options.storesDirs) {
      for (const storeDir of options.storesDirs) {
        addImportsDir(resolver.resolve(nuxt.options.rootDir, storeDir))
      }
    }
  },
})

export default module
