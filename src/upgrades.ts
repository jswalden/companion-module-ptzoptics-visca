import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionUpgradeContext,
} from '@companion-module/base'
import type { PtzOpticsConfig } from './config.js'
import {
	addCommandParametersAndResponseToCustomCommandOptions,
	addResponseParametersToCustomCommandOptions,
	isCustomCommandMissingCommandParametersAndResponse,
	isCustomCommandWithResponsesMissingParameters,
} from './custom-command-action.js'

/**
 * At one time, the "Custom command" action took only a single option with id
 * "custom" specifying the bytes to send.
 *
 * Now, the "Custom command" action supports user-defined parameters in the
 * command being sent and an expected series of responses through a bunch of
 * added option ids.
 *
 * Add default values for all those new option ids to old-school `options` that
 * lack them.
 */
function updateCustomCommandsWithParamsAndResponses(
	_context: CompanionUpgradeContext<PtzOpticsConfig>,
	props: CompanionStaticUpgradeProps<PtzOpticsConfig>
): CompanionStaticUpgradeResult<PtzOpticsConfig> {
	const result: CompanionStaticUpgradeResult<PtzOpticsConfig> = {
		updatedActions: [],
		updatedConfig: null,
		updatedFeedbacks: [],
	}

	for (const action of props.actions) {
		if (isCustomCommandMissingCommandParametersAndResponse(action)) {
			addCommandParametersAndResponseToCustomCommandOptions(action.options)

			result.updatedActions.push(action)
		}
	}

	return result
}

/**
 * At one time, "Custom command" responses consisted only of one or more byte
 * value/mask sequences to match them against.
 *
 * Now, responses also support user-defined parameters in response messages,
 * whose numeric values are then stored into user-specified custom variables.
 *
 * Annotate "Custom command" action options so that all expected responses are
 * treated as containing no parameters.
 */
function updateCustomCommandResponsesWithParameters(
	_context: CompanionUpgradeContext<PtzOpticsConfig>,
	props: CompanionStaticUpgradeProps<PtzOpticsConfig>
): CompanionStaticUpgradeResult<PtzOpticsConfig> {
	const result: CompanionStaticUpgradeResult<PtzOpticsConfig> = {
		updatedActions: [],
		updatedConfig: null,
		updatedFeedbacks: [],
	}

	for (const action of props.actions) {
		if (isCustomCommandWithResponsesMissingParameters(action)) {
			addResponseParametersToCustomCommandOptions(action.options)

			result.updatedActions.push(action)
		}
	}

	return result
}

export const UpgradeScripts = [updateCustomCommandsWithParamsAndResponses, updateCustomCommandResponsesWithParameters]
