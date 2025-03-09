import type { KnipConfig } from 'knip'

const config: KnipConfig = {
	entry: ['src/main.ts', 'jest.config.ts'],
	project: ['src/**/*.ts'],
	ignoreDependencies: [
		// This is used by n/* lint rules which Knip doesn't seem to be smart
		// enough to detect as being used and therefore requiring the plugin.
		'eslint-plugin-n',
	],
}

export default config
