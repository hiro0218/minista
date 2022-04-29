import type { Plugin, PluginBuild } from "esbuild"
import type { Config as SvgrOptions } from "@svgr/core"

import fs from "fs-extra"
import path from "path"

/*! Fork: esbuild-plugin-resolve | https://github.com/markwylde/esbuild-plugin-resolve */
export function resolvePlugin(options: { [key: string]: string }): Plugin {
  return {
    name: "esbuild-resolve",
    setup: (build: PluginBuild) => {
      for (const moduleName of Object.keys(options)) {
        resolvePluginIntercept(build, moduleName, options[moduleName])
      }
    },
  }
}

function resolvePluginIntercept(
  build: PluginBuild,
  moduleName: string,
  moduleTarget: string
) {
  const filter = new RegExp("^" + moduleName + "(?:\\/.*)?$")

  build.onResolve({ filter }, async (args) => {
    if (args.resolveDir === "") {
      return
    }

    return {
      path: args.path,
      namespace: "esbuild-resolve",
      pluginData: {
        resolveDir: args.resolveDir,
        moduleName,
      },
    }
  })

  build.onLoad({ filter, namespace: "esbuild-resolve" }, async (args) => {
    const importerCode = `
      export * from '${args.path.replace(
        args.pluginData.moduleName,
        moduleTarget
      )}';
      export { default } from '${args.path.replace(
        args.pluginData.moduleName,
        moduleTarget
      )}';
    `
    return { contents: importerCode, resolveDir: args.pluginData.resolveDir }
  })
}

/*! Fork: esbuild-plugin-svgr | https://github.com/kazijawad/esbuild-plugin-svgr */
export function svgrPlugin(options: SvgrOptions): Plugin {
  return {
    name: "esbuild-svgr",
    setup(build) {
      build.onLoad({ filter: /\.svg$/ }, async (args) => {
        const { transform: transformSvgr } = await import("@svgr/core")
        const svg = await fs.promises.readFile(args.path, "utf8")
        const contents = await transformSvgr(
          svg,
          { ...options },
          { filePath: args.path }
        )
        return {
          contents,
          loader: options.typescript ? "tsx" : "jsx",
        }
      })
    },
  }
}

/*! Fork: esbuild-plugin-resolve | https://github.com/hannoeru/esbuild-plugin-raw */
export function rawPlugin(): Plugin {
  return {
    name: "esbuild-raw",
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, (args) => {
        return {
          path: path.isAbsolute(args.path)
            ? args.path
            : path.join(args.resolveDir, args.path),
          namespace: "raw-loader",
        }
      })
      build.onLoad(
        { filter: /\?raw$/, namespace: "raw-loader" },
        async (args) => {
          return {
            contents: await fs.promises.readFile(
              args.path.replace(/\?raw$/, "")
            ),
            loader: "text",
          }
        }
      )
    },
  }
}