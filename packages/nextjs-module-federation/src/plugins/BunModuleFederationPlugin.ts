import { BuildConfig, BunPlugin, OnLoadCallback, OnLoadResult, OnResolveCallback, PluginConstraints } from "bun";

/*
export default class BunModuleFederationPlugin implements BunPlugin {
    name?: string | undefined;
    target?: Target | undefined;
    setup(build: PluginBuilder): void | Promise<void> {
        throw new Error("Method not implemented.");
    }
}
*/

/**
 * Options for the Bun Module Federation Plugin.
 */
type BunModuleFederatedPluginOptions = {
    /**
     * Exposes configuration for federated modules.
     * Maps module names to their corresponding file paths or URLs.
     */
    exposes?: Record<string, string>;

    /**
     * Remotes configuration for federated modules.
     * Maps module names to their corresponding remote URLs.
     */
    remotes?: Record<string, string>;

    /**
     * Shared configuration for federated modules.
     * Maps module names to shared module versions or boolean flags.
     */
    shared?: Record<string, string | boolean>;

    /**
     * The share scope for the federated modules.
     * Specifies the scope in which shared modules are available.
     */
    shareScope?: string;
};

/**
 * Custom PluginBuilder interface.
 */
type PluginBuilder = {
    /**
     * Register a callback to handle loading of imports matching the specified constraints.
     * @param constraints The constraints to apply the plugin to.
     * @param callback The callback to handle the import.
     */
    onLoad(constraints: PluginConstraints, callback: OnLoadCallback): void;

    /**
     * Register a callback to handle resolving of imports matching the specified constraints.
     * @param constraints The constraints to apply the plugin to.
     * @param callback The callback to handle the import.
     */
    onResolve(constraints: PluginConstraints, callback: OnResolveCallback): void;

    /**
     * Register a callback to be executed at the end of the build process.
     * @param callback The callback to execute at the end of the build.
     */
    onEnd(callback: () => void): void;

    /**
     * Emit a file during the build process.
     * @param options The options for emitting the file.
     */
    emitFile(options: { name: string; contents: string; pluginName?: string; }): void;

    /**
     * The configuration object passed to `Bun.build`.
     * Can be mutated to modify the build configuration.
     */
    config: BuildConfig & { plugins: BunPlugin[] };
};

export default class BunModuleFederationPlugin implements BunPlugin {
    private options: BunModuleFederatedPluginOptions

    constructor(options: BunModuleFederatedPluginOptions) {
        this.options = options
    }

    setup(build: PluginBuilder): void {
        const { options } = this

        // Create federated modules configuration
        const federatedModules = {
            exposes: options.exposes,
            remotes: options.remotes,
            shared: options.shared,
            shareScope: options.shareScope,
        };

        // Add the FederatedModulesPlugin to the plugin builder
        build.onResolve({ filter: /.*/ }, async (args) => {
            // Resolve remote module requests
            if (options.remotes && args.path in options.remotes) {
                return {
                    path: options.remotes[args.path],
                    external: true,
                };
            }
        });

        build.onLoad({ filter: /.*/ }, async (args) => {
            // Load and transform federated modules
            if (options.exposes && args.path in options.exposes) {
                const modulePath = options.exposes[args.path];
                const moduleCode = await fetch(modulePath).then((res) => res.text());

                return {
                    contents: moduleCode,
                    resolveDir: modulePath,
                } as OnLoadResult;
            }
            return {
                contents: '',
                loader: 'js',
            }
        });

        // Add the FederatedModulesPlugin to the plugin builder
        build.onEnd(() => {
            build.emitFile({
                name: 'federated-modules.json',
                contents: JSON.stringify(federatedModules),
                pluginName: 'BunModuleFederationPlugin',
            });
        });

        const { config } = build
        console.log(config)
    }
}