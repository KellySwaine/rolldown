import { normalizeHook } from '../utils/normalize-hook'
import type { BindingPluginOptions } from '../binding'

import type { Plugin } from './index'
import { NormalizedInputOptions } from '../options/normalized-input-options'
import { isEmptySourcemapFiled, transformModuleInfo } from '../utils'
import path from 'path'
import { SourceMapInputObject } from '../types/sourcemap'
import { transformPluginContext } from './plugin-context'

export function bindingifyBuildStart(
  plugin: Plugin,
  options: NormalizedInputOptions,
): BindingPluginOptions['buildStart'] {
  const hook = plugin.buildStart
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx) => {
    await handler.call(transformPluginContext(options, ctx, plugin), options)
  }
}

export function bindingifyBuildEnd(
  plugin: Plugin,
  options: NormalizedInputOptions,
): BindingPluginOptions['buildEnd'] {
  const hook = plugin.buildEnd
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx, err) => {
    await handler.call(
      transformPluginContext(options, ctx, plugin),
      err ? new Error(err) : undefined,
    )
  }
}

export function bindingifyResolveId(
  plugin: Plugin,
  options: NormalizedInputOptions,
): BindingPluginOptions['resolveId'] {
  const hook = plugin.resolveId
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx, specifier, importer, extraOptions) => {
    const ret = await handler.call(
      transformPluginContext(options, ctx, plugin),
      specifier,
      importer ?? undefined,
      extraOptions,
    )
    if (ret == false || ret == null) {
      return
    }
    if (typeof ret === 'string') {
      return {
        id: ret,
      }
    }
    return ret
  }
}

export function bindingifyResolveDynamicImport(
  plugin: Plugin,
  options: NormalizedInputOptions,
): BindingPluginOptions['resolveDynamicImport'] {
  const hook = plugin.resolveDynamicImport
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx, specifier, importer) => {
    const ret = await handler.call(
      transformPluginContext(options, ctx, plugin),
      specifier,
      importer ?? undefined,
    )
    if (ret == false || ret == null) {
      return
    }
    if (typeof ret === 'string') {
      return {
        id: ret,
      }
    }
    return ret
  }
}

export function bindingifyTransform(
  hook?: Plugin['transform'],
): BindingPluginOptions['transform'] {
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx, code, id) => {
    const ret = await handler.call(null, code, id)

    if (ret == null) {
      return
    }

    if (typeof ret === 'string') {
      return { code: ret }
    }

    if (!ret.map) {
      return { code: ret.code }
    }

    return {
      code: ret.code,
      map: typeof ret.map === 'object' ? JSON.stringify(ret.map) : ret.map,
    }
  }
}

export function bindingifyLoad(
  plugin: Plugin,
  options: NormalizedInputOptions,
): BindingPluginOptions['load'] {
  const hook = plugin.load
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx, id) => {
    const ret = await handler.call(
      transformPluginContext(options, ctx, plugin),
      id,
    )

    if (ret == null) {
      return
    }

    if (typeof ret === 'string') {
      return { code: ret }
    }

    if (!ret.map) {
      return { code: ret.code }
    }

    let map =
      typeof ret.map === 'object'
        ? ret.map
        : (JSON.parse(ret.map) as SourceMapInputObject)
    if (!isEmptySourcemapFiled(map.sources)) {
      // normalize original sourcemap sources
      // Port form https://github.com/rollup/rollup/blob/master/src/utils/collapseSourcemaps.ts#L180-L188.
      const directory = path.dirname(id) || '.'
      const sourceRoot = map.sourceRoot || '.'
      map.sources = map.sources!.map((source) =>
        path.resolve(directory, sourceRoot, source!),
      )
    }

    return {
      code: ret.code,
      map: JSON.stringify(map),
    }
  }
}

export function bindingifyModuleParsed(
  plugin: Plugin,
  options: NormalizedInputOptions,
): BindingPluginOptions['moduleParsed'] {
  const hook = plugin.moduleParsed
  if (!hook) {
    return undefined
  }
  const [handler, _optionsIgnoredSofar] = normalizeHook(hook)

  return async (ctx, moduleInfo) => {
    await handler.call(
      transformPluginContext(options, ctx, plugin),
      transformModuleInfo(moduleInfo),
    )
  }
}
