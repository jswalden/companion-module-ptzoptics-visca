import type { CompanionActionDefinition } from '@companion-module/base'
import type { CustomCommandActionId } from './custom-command.js'
import type { ExposureActionId } from './exposure.js'
import type { FocusActionId } from './focus.js'
import type { OSDActionId } from './osd.js'
import type { PanTiltActionId } from './pan-tilt.js'
import type { PresetActionId } from './presets.js'
import type { WhiteBalanceActionId } from './white-balance.js'
import type { ZoomActionId } from './zoom.js'

/**
 * The type of action definitions for all actions within the specified action
 * set.
 */
export type ActionDefinitions<ActionSet extends string> = {
	[actionId in ActionSet]: CompanionActionDefinition
}

export enum OtherActionId {
	CameraPowerState = 'power',
	AutoTracking = 'autoTracking',
}

export type PtzOpticsActionId =
	// Force to separate lines
	| OtherActionId
	// Force to separate lines
	| CustomCommandActionId
	| ExposureActionId
	| FocusActionId
	| OSDActionId
	| PanTiltActionId
	| PresetActionId
	| WhiteBalanceActionId
	| ZoomActionId
