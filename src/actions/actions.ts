import type { CompanionActionEvent } from '@companion-module/base'
import { type ActionDefinitions, type OtherActionId, OtherActionId as PtzOpticsActionId } from './actionid.js'
import {
	AutoTracking,
	AutoWhiteBalanceSensitivity,
	CameraPower,
	ExposureMode,
	FocusFarStandard,
	FocusLock,
	FocusMode,
	FocusNearStandard,
	FocusStop,
	FocusUnlock,
	IrisDown,
	IrisSet,
	IrisUp,
	OnScreenDisplayBack,
	OnScreenDisplayClose,
	OnScreenDisplayEnter,
	OnScreenDisplayNavigate,
	OnScreenDisplayToggle,
	PanTiltAction,
	PanTiltDirection,
	PanTiltHome,
	ShutterDown,
	ShutterSet,
	ShutterUp,
	WhiteBalance,
	WhiteBalanceOnePushTrigger,
	ZoomIn,
	ZoomOut,
	ZoomStop,
	sendPanTiltCommand,
} from '../camera/commands.js'
import { ExposureModeInquiry, FocusModeInquiry, OnScreenDisplayInquiry } from '../camera/inquiries.js'
import {
	AutoTrackingOption,
	AutoWhiteBalanceSensitivityOption,
	CameraPowerOption,
	ExposureModeOption,
	FocusModeOption,
	IrisSetOption,
	OnScreenDisplayNavigateOption,
	OnScreenDisplayOption,
	PanTiltSetSpeedOption,
	ShutterSetOption,
	WhiteBalanceOption,
} from '../camera/options.js'
import { generateCustomCommandAction } from '../custom-command-action.js'
import type { PtzOpticsInstance } from '../instance.js'

export function otherActions(instance: PtzOpticsInstance): ActionDefinitions<OtherActionId> {
	function createPanTiltCallback(direction: readonly [number, number]) {
		return async (_event: CompanionActionEvent) => {
			const { panSpeed, tiltSpeed } = instance.panTiltSpeed()
			sendPanTiltCommand(instance, direction, panSpeed, tiltSpeed)
		}
	}

	return {
		[PtzOpticsActionId.PanTiltLeft]: {
			name: 'Pan Left',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.Left]),
		},
		[PtzOpticsActionId.PanTiltRight]: {
			name: 'Pan Right',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.Right]),
		},
		[PtzOpticsActionId.PanTiltUp]: {
			name: 'Tilt Up',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.Up]),
		},
		[PtzOpticsActionId.PanTiltDown]: {
			name: 'Tilt Down',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.Down]),
		},
		[PtzOpticsActionId.PanTiltUpLeft]: {
			name: 'Up Left',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.UpLeft]),
		},
		[PtzOpticsActionId.PanTiltUpRight]: {
			name: 'Up Right',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.UpRight]),
		},
		[PtzOpticsActionId.PanTiltDownLeft]: {
			name: 'Down Left',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.DownLeft]),
		},
		[PtzOpticsActionId.PanTiltDownRight]: {
			name: 'Down Right',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.DownRight]),
		},
		[PtzOpticsActionId.PanTiltStop]: {
			name: 'P/T Stop',
			options: [],
			callback: createPanTiltCallback(PanTiltDirection[PanTiltAction.Stop]),
		},
		[PtzOpticsActionId.PanTiltHome]: {
			name: 'P/T Home',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(PanTiltHome)
			},
		},
		[PtzOpticsActionId.PanTiltSetSpeed]: {
			name: 'P/T Speed',
			options: [
				{
					type: 'dropdown',
					label: 'Speed setting',
					id: PanTiltSetSpeedOption.id,
					choices: PanTiltSetSpeedOption.choices,
					default: PanTiltSetSpeedOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				const speed = parseInt(String(event.options['speed']), 16)
				instance.setPanTiltSpeed(speed)
			},
		},
		[PtzOpticsActionId.PanTiltSpeedUp]: {
			name: 'P/T Speed Up',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.increasePanTiltSpeed()
			},
		},
		[PtzOpticsActionId.PanTiltSpeedDown]: {
			name: 'P/T Speed Down',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.decreasePanTiltSpeed()
			},
		},
		[PtzOpticsActionId.StartZoomIn]: {
			name: 'Zoom In',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(ZoomIn)
			},
		},
		[PtzOpticsActionId.StartZoomOut]: {
			name: 'Zoom Out',
			options: [],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(ZoomOut, event.options)
			},
		},
		[PtzOpticsActionId.StopZoom]: {
			name: 'Zoom Stop',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(ZoomStop)
			},
		},
		[PtzOpticsActionId.StartFocusNearer]: {
			name: 'Focus Near',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusNearStandard)
			},
		},
		[PtzOpticsActionId.StartFocusFarther]: {
			name: 'Focus Far',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusFarStandard)
			},
		},
		[PtzOpticsActionId.StopFocus]: {
			name: 'Focus Stop',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusStop)
			},
		},
		[PtzOpticsActionId.SelectFocusMode]: {
			name: 'Focus Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Auto/manual focus',
					id: FocusModeOption.id,
					choices: FocusModeOption.choices,
					default: FocusModeOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(FocusMode, event.options)
			},
			learn: async (_event: CompanionActionEvent) => {
				const opts = await instance.sendInquiry(FocusModeInquiry)
				if (opts === null) return undefined
				return { ...opts }
			},
		},
		[PtzOpticsActionId.LockFocus]: {
			name: 'Focus Lock',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusLock)
			},
		},
		[PtzOpticsActionId.UnlockFocus]: {
			name: 'Focus Unlock',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(FocusUnlock)
			},
		},
		[PtzOpticsActionId.SelectExposureMode]: {
			name: 'Exposure Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Mode setting',
					id: ExposureModeOption.id,
					choices: ExposureModeOption.choices,
					default: ExposureModeOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(ExposureMode, event.options)
			},
			learn: async (_event: CompanionActionEvent) => {
				const opts = await instance.sendInquiry(ExposureModeInquiry)
				if (opts === null) return undefined
				return { ...opts }
			},
		},
		[PtzOpticsActionId.IrisUp]: {
			name: 'Iris Up',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(IrisUp)
			},
		},
		[PtzOpticsActionId.IrisDown]: {
			name: 'Iris Down',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(IrisDown)
			},
		},
		[PtzOpticsActionId.SetIris]: {
			name: 'Set Iris',
			options: [
				{
					type: 'dropdown',
					label: 'Iris setting',
					id: IrisSetOption.id,
					choices: IrisSetOption.choices,
					default: IrisSetOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(IrisSet, event.options)
			},
		},
		[PtzOpticsActionId.ShutterUp]: {
			name: 'Shutter Up',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(ShutterUp)
			},
		},
		[PtzOpticsActionId.ShutterDown]: {
			name: 'Shutter Down',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(ShutterDown)
			},
		},
		[PtzOpticsActionId.SetShutter]: {
			name: 'Set Shutter',
			options: [
				{
					type: 'dropdown',
					label: 'Shutter setting',
					id: ShutterSetOption.id,
					choices: ShutterSetOption.choices,
					default: ShutterSetOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(ShutterSet, event.options)
			},
		},
		[PtzOpticsActionId.CameraPowerState]: {
			name: 'Power Camera',
			options: [
				{
					type: 'dropdown',
					label: 'Power on/standby',
					id: CameraPowerOption.id,
					choices: CameraPowerOption.choices,
					default: CameraPowerOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(CameraPower, event.options)
			},
		},
		[PtzOpticsActionId.OSD]: {
			name: 'OSD Open/Close',
			options: [
				{
					type: 'dropdown',
					label: 'Activate OSD menu',
					id: OnScreenDisplayOption.id,
					choices: [...OnScreenDisplayOption.choices, { id: 'toggle', label: 'Toggle' }],
					default: 'toggle',
				},
			],
			callback: async ({ options }) => {
				let shouldToggle = false
				switch (options[OnScreenDisplayOption.id]) {
					case 'close':
						instance.sendCommand(OnScreenDisplayClose)
						return
					case 'toggle':
						shouldToggle = true
						break
					case 'open': {
						const opts = await instance.sendInquiry(OnScreenDisplayInquiry)
						if (opts === null) return
						shouldToggle = opts[OnScreenDisplayOption.id] !== 'open'
					}
				}

				if (shouldToggle) {
					instance.sendCommand(OnScreenDisplayToggle)
				}
			},
			learn: async (_event: CompanionActionEvent) => {
				const opts = await instance.sendInquiry(OnScreenDisplayInquiry)
				if (opts === null) return undefined
				return { ...opts }
			},
		},
		[PtzOpticsActionId.OSDNavigate]: {
			name: 'Navigate OSD Camera menu',
			options: [
				{
					type: 'dropdown',
					label: 'Direction',
					id: OnScreenDisplayNavigateOption.id,
					choices: OnScreenDisplayNavigateOption.choices,
					default: 'down',
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(OnScreenDisplayNavigate, event.options)
			},
		},
		[PtzOpticsActionId.OSDEnter]: {
			name: 'OSD Enter',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(OnScreenDisplayEnter)
			},
		},
		[PtzOpticsActionId.OSDBack]: {
			name: 'OSD Back',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(OnScreenDisplayBack)
			},
		},
		[PtzOpticsActionId.SelectWhiteBalance]: {
			name: 'White balance',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: WhiteBalanceOption.id,
					choices: WhiteBalanceOption.choices,
					default: WhiteBalanceOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(WhiteBalance, event.options)
			},
		},
		[PtzOpticsActionId.WhiteBalanceOnePushTrigger]: {
			name: 'White balance one push trigger',
			options: [],
			callback: async (_event: CompanionActionEvent) => {
				instance.sendCommand(WhiteBalanceOnePushTrigger)
			},
		},
		[PtzOpticsActionId.SelectAutoWhiteBalanceSensitivity]: {
			name: 'Auto white balance sensitivity',
			options: [
				{
					type: 'dropdown',
					label: 'Sensitivity',
					id: AutoWhiteBalanceSensitivityOption.id,
					choices: AutoWhiteBalanceSensitivityOption.choices,
					default: AutoWhiteBalanceSensitivityOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(AutoWhiteBalanceSensitivity, event.options)
			},
		},
		[PtzOpticsActionId.AutoTracking]: {
			name: 'Auto Tracking',
			options: [
				{
					type: 'dropdown',
					label: 'Auto tracking (PTZ Optics G3 model required)',
					id: AutoTrackingOption.id,
					choices: AutoTrackingOption.choices,
					default: AutoTrackingOption.default,
				},
			],
			callback: async (event: CompanionActionEvent) => {
				instance.sendCommand(AutoTracking, event.options)
			},
		},
		[PtzOpticsActionId.SendCustomCommand]: generateCustomCommandAction(instance),
	}
}
