import type {
	CompanionActionContext,
	CompanionActionDefinition,
	CompanionActionInfo,
	CompanionInputFieldCustomVariable,
	CompanionInputFieldTextInput,
	CompanionOptionValues,
	SomeCompanionActionInputField,
} from '@companion-module/base'
import { PtzOpticsActionId } from './actions-enum.js'
import type { PtzOpticsInstance } from './instance.js'
import {
	UserDefinedCommand,
	type CommandParams,
	type PartialCommandParams,
	type Response,
	type PartialResponseParams,
} from './visca/command.js'
import { prettyBytes } from './visca/utils.js'

/** Parse a VISCA message string into an array of byte values. */
function parseMessage(msg: string): readonly number[] {
	const hexData = msg.replace(/\s+/g, '')
	const command = []
	for (let i = 0; i < hexData.length; i += 2) {
		command.push(parseInt(hexData.substr(i, 2), 16))
	}
	return command
}

/**
 * The isVisible callback for inputs that correspond to parameters in the
 * command.
 */
function commandParameterInputIsVisible(options: CompanionOptionValues, i: number): boolean {
	const commandParams = String(options['command_parameters'])
	if (commandParams === '') {
		return false
	}

	// This must be a local, uninherited, duplicated constant because
	// isVisible functions are converted to and from string.
	const PARAMETERS_SPLITTER = /; ?/g

	const commandParamCount = commandParams.split(PARAMETERS_SPLITTER).length
	return i < commandParamCount
}

// Pan Tilt:Pan Tilt Drive:RelativePosition has 4 parameters.
// 81 01 06 03 vv ww 0y 0y 0y 0y 0z 0z 0z 0z FF
const MAX_PARAMETERS_IN_COMMAND = 4

const CommandParameterDefault = ''

/**
 * Generate text inputs corresponding to values to set in parameters of the
 * command.
 */
function generateInputsForCommandParameters(): CompanionInputFieldTextInput[] {
	const inputs: CompanionInputFieldTextInput[] = []
	for (let i = 0; i < MAX_PARAMETERS_IN_COMMAND; i++) {
		inputs.push({
			type: 'textinput',
			id: `parameter${i}`,
			label: `Command parameter #${i + 1}`,
			default: CommandParameterDefault,
			useVariables: true,
			isVisibleData: i,
			isVisible: commandParameterInputIsVisible,
		})
	}
	return inputs
}

/**
 * Add option values for command parameters to "Custom command" action options
 * that lack them.
 */
function addCommandParameterDefaults(options: CompanionOptionValues): void {
	for (let i = 0; i < MAX_PARAMETERS_IN_COMMAND; i++) {
		options[`parameter${i}`] = CommandParameterDefault
	}
}

/**
 * The isVisible callback for inputs that correspond to parameters in the
 * response messages to the command.
 */
function responseParameterVariablePickerIsVisible(
	options: CompanionOptionValues,
	[i, parameters_option]: [number, string]
): boolean {
	const responseParams = options[parameters_option]
	if (typeof responseParams !== 'string' || responseParams === '') {
		return false
	}

	// This must be a local, uninherited, duplicated constant because
	// isVisible functions are converted to and from string.
	const PARAMETERS_SPLITTER = /; ?/g

	const responseParamCount = responseParams.split(PARAMETERS_SPLITTER).length
	return i < responseParamCount
}

// Block Color & Exposure Inquiry's response has an unfathomable 10 parameters.
// 90 50 0p 0p 0q 0q 0r 0s tt 0u vv ww 00 xx 0z FF
const MAX_PARAMETERS_IN_RESPONSE_MESSAGE = 10

/**
 * Generate text inputs corresponding to values to set in parameters of the
 * command.
 * @param response
 *    The number of the response being targeted, e.g. in the standard response
 *    of ACK + Completion this is either 0 or 1.
 * @param parameters_option
 *    The option-id that specifies the particular response's parameters string.
 * @returns {CompanionInputFieldCustomVariable[]}
 */
function generateCustomVariablePickersForResponseParameters(
	response: number,
	parameters_option: string
): CompanionInputFieldCustomVariable[] {
	const pickers: CompanionInputFieldCustomVariable[] = []
	for (let i = 0; i < MAX_PARAMETERS_IN_RESPONSE_MESSAGE; i++) {
		pickers.push({
			type: 'custom-variable',
			id: `response${response}_parameter${i}`,
			label: `Response ${response} parameter ${i + 1}`,
			isVisibleData: [i, parameters_option],
			isVisible: responseParameterVariablePickerIsVisible,
		})
	}
	return pickers
}

// The standard reply to an inquiry is one message containing one or more
// parameters, so this must be at least 1.
//
// The standard response to a command is ACK and Completion, so this must be at
// least 2.
//
// Leave it at 2 til someone wants more.
const MAX_MESSAGES_IN_RESPONSE = 2

const PARAMETERS_SPLITTER = /; ?/g
const NIBBLES_SPLITTER = /, ?/g

/**
 * Parse a message parameters string (like "5" or "6,7" or "8; 10,12; 13") into
 * an array of parameters, each of which is an array of half-byte offsets into a
 * VISCA message.
 *
 * @param command
 *    The message to which the parameters information is being applied
 * @param parametersString
 *    A parameters string: a semicolon-separated list of comma-separated lists
 *    of nibble offsets, all nibble offsets being unique and referring to
 *    nibbles in `command` that are zero.
 */
function parseParameterString(command: readonly number[], parametersString: string): readonly (readonly number[])[] {
	if (parametersString === '') return []

	const params = parametersString.split(PARAMETERS_SPLITTER)

	// Parse.
	const parameters = params.map((parameterString) => {
		return parameterString.split(NIBBLES_SPLITTER).map((ds) => parseInt(ds, 10))
	})

	// Validate.
	const seen = new Set<number>()
	for (const nibbles of parameters) {
		for (const nibble of nibbles) {
			if (nibble < 2 || 2 * command.length - 2 <= nibble) {
				throw new RangeError(`offset ${nibble} is out of range` + '\n' + new Error().stack)
			}
			if (seen.has(nibble)) {
				throw new RangeError(`offset ${nibble} appears multiple times in parameters`)
			}

			const b = command[nibble >> 1]
			const mask = nibble % 2 === 0 ? 0xf0 : 0x0f
			if ((b & mask) !== 0) {
				throw new RangeError(`half-byte at offset ${nibble} is nonzero`)
			}

			seen.add(nibble)
		}
	}

	return parameters
}

/** Parse a string defining the bytes of a VISCA command/inquiry. */
function parseCommand(options: CompanionOptionValues): [readonly number[], CommandParams] {
	const commandBytes = parseMessage(String(options['custom']))

	const commandParams: PartialCommandParams = {}
	for (const [i, nibbles] of Object.entries(
		parseParameterString(commandBytes, String(options['command_parameters']))
	)) {
		commandParams[`param_${i}`] = {
			nibbles,
			choiceToParam: Number,
		}
	}

	return [commandBytes, commandParams]
}

/**
 * Parse response options info into response/parameters info to pass to
 * `UserDefinedCommand`.
 */
function parseResponses(options: CompanionOptionValues): Response[] {
	const responses: Response[] = []

	const responseCount = Number(options['response_count'])
	for (let i = 0; i < responseCount; i++) {
		const valueBytes = parseMessage(String(options[`response${i}_bytes`]))
		const maskBytes = parseMessage(String(options[`response${i}_mask`]))
		if (valueBytes.length !== maskBytes.length) {
			throw new RangeError(`response #${i + 1} values and mask are different lengths`)
		}

		const paramList = parseParameterString(valueBytes, String(options[`response${i}_parameters`]))

		const partialParams = paramList.reduce((params, nibbles, j) => {
			params[`response${i}_param${j}`] = {
				nibbles,
				paramToChoice: String,
			}
			return params
		}, {} as PartialResponseParams)

		responses.push({
			value: valueBytes,
			mask: maskBytes,
			params: partialParams,
		})
	}

	return responses
}

/**
 * Make an options object to pass to `PtzOpticsInstance.sendCommand` to fill
 * parameter values in the user-defined command.
 */
async function makeCommandOptions(
	options: CompanionOptionValues,
	context: CompanionActionContext,
	commandParams: CommandParams
) {
	const commandOpts: CompanionOptionValues = {}
	for (const key of Object.keys(commandParams)) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const i = key.match(/^param_(\d+)$/)![1]
		const val = await context.parseVariablesInString(String(options[`parameter${i}`]))
		commandOpts[key] = Number(val)
	}

	return commandOpts
}

function processCommandResponseAndSetVariables(
	instance: PtzOpticsInstance,
	responseMessages: Response[],
	options: CompanionOptionValues,
	responseOptions: CompanionOptionValues
) {
	for (let i = 0; i < responseMessages.length; i++) {
		const response = responseMessages[i]
		const responseParams = response.params
		for (const id of Object.keys(responseParams)) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const j = id.match(/^response(?:\d+)_param(\d+)$/)![1]

			const customVarName = String(options[`response${i}_parameter${j}`])
			const newVal = Number(responseOptions[`response${i}_param${j}`])

			instance.log('info', `Setting $(${customVarName}) to ${newVal}...`)
			instance.setCustomVariableValue(customVarName, newVal)
		}
	}
}

const STANDARD_RESPONSE = [
	{ bytes: '90 40 FF', mask: 'FF F0 FF' },
	{ bytes: '90 50 FF', mask: 'FF F0 FF' },
]

type ResponseField = keyof (typeof STANDARD_RESPONSE)[0]

/**
 * Get the value of the given custom-command option for the `i`th return message
 * in a custom command's default response.
 */
function getResponseOptionDefault(i: number, field: ResponseField): string {
	if (i < STANDARD_RESPONSE.length) {
		const resp = STANDARD_RESPONSE[i]
		return resp[field]
	}
	return ''
}

const CommandParametersOptionId = 'command_parameters'
const CommandParametersDefault = ''

const ResponseCountOptionId = 'response_count'
const ResponseCountDefault = STANDARD_RESPONSE.length

function addResponseDefaults(options: CompanionOptionValues): void {
	for (let i = 0; i < MAX_MESSAGES_IN_RESPONSE; i++) {
		options[`response${i}_bytes`] = getResponseOptionDefault(i, 'bytes')
		options[`response${i}_mask`] = getResponseOptionDefault(i, 'mask')
	}
}

/**
 * Determine whether the given action information corresponds to a "Custom
 * command" action consisting only of a byte sequence, missing any information
 * about parameters within it or the expected response to it.
 */
export function isCustomCommandMissingCommandParametersAndResponse(action: CompanionActionInfo): boolean {
	return action.actionId === PtzOpticsActionId.SendCustomCommand && !(CommandParametersOptionId in action.options)
}

/**
 * At one time, the "Custom command" action took only a single option with id
 * "custom" specifying the bytes to send.
 *
 * Now, the "Custom command" action supports user-defined parameters in the
 * command being sent and an expected series of responses through a bunch of
 * added option ids.
 *
 * Add plausible default values for all those new option ids to old-school
 * `options` that lack them.
 */
export function addCommandParametersAndResponseToCustomCommandOptions(options: CompanionOptionValues): void {
	options[CommandParametersOptionId] = CommandParametersDefault
	addCommandParameterDefaults(options)
	options[ResponseCountOptionId] = ResponseCountDefault
	addResponseDefaults(options)
}

const CommandResponse0ParametersOptionId = 'response0_parameters'
const NO_PARAMETERS = ''

export function isCustomCommandWithResponsesMissingParameters(action: CompanionActionInfo): boolean {
	return (
		action.actionId === PtzOpticsActionId.SendCustomCommand && !(CommandResponse0ParametersOptionId in action.options)
	)
}

/**
 * At one time, "Custom command" responses consisted only of byte values and a
 * mask to match them with.
 *
 * Now, the "Custom command" action supports user-defined parameters in all
 * response messages.
 *
 * Add "no parameters" options to all responses in "Custom command" action
 * `options` that lack them.
 */
export function addResponseParametersToCustomCommandOptions(options: CompanionOptionValues): void {
	for (let i = 0; i < MAX_MESSAGES_IN_RESPONSE; i++) {
		options[`response${i}_parameters`] = NO_PARAMETERS
		// No need to add any options for the individual parameters while this
		// option indicates no parameters are present in this response.
	}
}

/**
 * Generate an action definition for the "Custom command" action.
 */
export function generateCustomCommandAction(instance: PtzOpticsInstance): CompanionActionDefinition {
	const COMMAND_REGEX = '/^81 ?(?:[0-9a-fA-F]{2} ?){3,13}[fF][fF]$/'
	const PARAMETER_LIST_REGEX = '/^(?:[0-9]+(?:, ?[0-9]+)*(?:; ?[0-9]+(?:, ?[0-9]+)*)*|)$/'

	return {
		name: 'Custom command',
		description:
			'Send a command of custom bytes (with embedded parameters filled ' +
			'by user-defined expression) to the camera, and accept a ' +
			'response matching customized syntax.  (Any parameters in the ' +
			'response must be masked out: there is presently no way to ' +
			'access their values.)  Refer to PTZOptics VISCA over IP command ' +
			'documentation for command/response structure.',
		options: [
			{
				type: 'textinput',
				label: 'Bytes of command (set half-bytes in any parameters to zeroes)',
				id: 'custom',
				regex: COMMAND_REGEX,
			},
			{
				type: 'textinput',
				label: 'Parameter locations in command',
				id: CommandParametersOptionId,
				regex: PARAMETER_LIST_REGEX,
				tooltip:
					'The parameter list must be separated by ' +
					'semicolons.  Each parameter should be a comma-' +
					'separated sequence of half-byte offsets into ' +
					'the command.  Offsets must not be reused.',
				default: CommandParametersDefault,
			},
			...generateInputsForCommandParameters(),
			{
				type: 'number',
				label: 'Number of messages in response',
				id: ResponseCountOptionId,
				default: ResponseCountDefault,
				min: 1,
				max: MAX_MESSAGES_IN_RESPONSE,
			},
			...(() => {
				// The range of byte values allowed by these two regular
				// expressions must be identical.
				// 1 + (1 to 14) + 1
				const RESPONSE_REGEX = '/^90 ?(?:[0-9a-fA-F]{2} ?){1,14}[fF][fF]$/'
				// (2 to 15) + 1
				const RESPONSE_MASK_REGEX = '/(?:[0-9a-fA-F]{2} ?){2,15}[fF][fF]$/'

				const allResponseFields: SomeCompanionActionInputField[] = []
				for (let i = 0; i < MAX_MESSAGES_IN_RESPONSE; i++) {
					const isVisible = (options: CompanionOptionValues, i: number) => i < Number(options['response_count'])

					const responseFields: SomeCompanionActionInputField[] = [
						{
							type: 'textinput',
							label: `Bytes of expected response #${i + 1} (set half-bytes in any parameters to zeroes)`,
							id: `response${i}_bytes`,
							regex: RESPONSE_REGEX,
							default: getResponseOptionDefault(i, 'bytes'),
							isVisibleData: i,
							isVisible,
						},
						{
							type: 'textinput',
							label: `Mask bytes of expected response #${i + 1}`,
							id: `response${i}_mask`,
							regex: RESPONSE_MASK_REGEX,
							default: getResponseOptionDefault(i, 'mask'),
							isVisibleData: i,
							isVisible,
						},
						{
							type: 'textinput',
							label: `Parameter locations in response #${i + 1}`,
							id: `response${i}_parameters`,
							regex: PARAMETER_LIST_REGEX,
							default: NO_PARAMETERS,
							tooltip:
								'The parameter list must be separated by semicolons.  Each parameter should be a comma-separated sequence of half-byte offsets into the response.  Offsets must not be reused.',
							isVisibleData: i,
							isVisible,
						},
						...generateCustomVariablePickersForResponseParameters(i, `response${i}_parameters`),
					]

					allResponseFields.push(...responseFields)
				}

				return allResponseFields
			})(),
		],
		callback: async ({ options }, context) => {
			// Process all options to create the user-defined command.
			const [commandBytes, commandParams] = parseCommand(options)
			const responseMessages = parseResponses(options)

			// Create the user-defined command.
			const command = new UserDefinedCommand(commandBytes, commandParams, responseMessages)

			// Make the options to use to fill its parameters
			const commandOpts = await makeCommandOptions(options, context, commandParams)

			const responseOptions = await instance.sendCommand(command, commandOpts)
			if (responseOptions === null) {
				instance.log(
					'error',
					`error executing command whose bytes (pre-parameter interpolation) are ${prettyBytes(commandBytes)}`
				)
				return
			}

			// Extract all numeric parameters in the response messages and set
			// the specified custom variables.
			processCommandResponseAndSetVariables(instance, responseMessages, options, responseOptions)
		},
	}
}
