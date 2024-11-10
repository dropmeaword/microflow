import type { PiezoData, PiezoValueType } from '@microflow/components';
import { Icons } from '@microflow/ui';
import { Position } from '@xyflow/react';
import { Handle } from '../Handle';
import { BaseNode, NodeContainer, useNode, useNodeSettingsPane } from '../Node';
import { DEFAULT_NOTE, DEFAULT_SONG, NOTES_AND_FREQUENCIES } from './constants';
import { useNodeValue } from '../../../../stores/node-data';
import { useEffect, useState } from 'react';
import { MODES } from '../../../../../common/types';
import { mapPinToPaneOption } from '../../../../../utils/pin';
import { BindingApi, ButtonApi } from '@tweakpane/core';
import { SongEditor } from './SongEditor';
import { usePins } from '../../../../stores/board';

export function Piezo(props: Props) {
	return (
		<NodeContainer {...props}>
			<Value />
			<Settings />
			{props.data.type === 'buzz' && (
				<Handle type="target" position={Position.Left} id="buzz" offset={-0.5} />
			)}
			{props.data.type === 'song' && (
				<Handle type="target" position={Position.Left} id="play" offset={-0.5} />
			)}
			<Handle type="target" position={Position.Left} id="stop" offset={0.5} />
		</NodeContainer>
	);
}

function Value() {
	const { id, data } = useNode<PiezoData>();
	const value = useNodeValue<PiezoValueType>(id, false);

	if (!value) {
		if (data.type === 'song') return <Icons.Disc className="text-muted-foreground" size={48} />;
		return <Icons.Bell className="text-muted-foreground" size={48} />;
	}

	if (data.type === 'song') return <Icons.Disc3 className="animate-spin" size={48} />;
	return <Icons.BellRing className="animate-wiggle" size={48} />;
}

function Settings() {
	const { pane, settings, setHandlesToDelete } = useNodeSettingsPane<PiezoData>();
	const pins = usePins();
	const [editorOpened, setEditorOpened] = useState(false);

	useEffect(() => {
		if (!pane) return;

		let durationBinding: BindingApi | undefined;
		let frequencyBinding: BindingApi | undefined;
		let tempoBinding: BindingApi | undefined;
		let songBinding: ButtonApi | undefined;

		function addTypeBindings() {
			durationBinding?.dispose();
			frequencyBinding?.dispose();
			tempoBinding?.dispose();
			songBinding?.dispose();

			if (settings.type === 'buzz') {
				durationBinding = pane.addBinding(settings, 'duration', {
					index: 2,
					min: 100,
					max: 2500,
					step: 100,
				});

				frequencyBinding = pane.addBinding(settings, 'frequency', {
					index: 3,
					view: 'list',
					options: Array.from(NOTES_AND_FREQUENCIES.entries()).map(([note, frequency]) => ({
						text: note,
						value: frequency,
					})),
				});

				return;
			}

			settings.tempo = settings.tempo || 120;
			settings.song = settings.song || DEFAULT_SONG;
			tempoBinding = pane.addBinding(settings, 'tempo', {
				index: 2,
				min: 40,
				max: 240,
				step: 10,
			});
			songBinding = pane
				.addButton({
					index: 3,
					label: 'song',
					title: 'edit song',
				})
				.on('click', () => {
					setEditorOpened(true);
				});
		}

		pane.addBinding(settings, 'pin', {
			view: 'list',
			disabled: !pins.length,
			label: 'pin',
			index: 0,
			options: pins
				.filter(
					pin => pin.supportedModes.includes(MODES.INPUT) && pin.supportedModes.includes(MODES.PWM),
				)
				.map(mapPinToPaneOption),
		});

		pane
			.addBinding(settings, 'type', {
				view: 'list',
				index: 1,
				options: [
					{ text: 'buzz', value: 'buzz' },
					{ text: 'song', value: 'song' },
				],
			})
			.on('change', addTypeBindings);

		addTypeBindings();
	}, [pane, settings, pins]);

	useEffect(() => {
		setHandlesToDelete(['buzz', 'play']);
	}, [setHandlesToDelete]);

	if (!editorOpened) return null;
	if (settings.type === 'buzz') return null;

	return (
		<SongEditor
			song={settings.song}
			onClose={() => {
				setEditorOpened(false);
			}}
			onSave={data => {
				console.log(data);
				settings.song = data.song;
				setEditorOpened(false);
			}}
		/>
	);
}

export const DEFAULT_FREQUENCY = NOTES_AND_FREQUENCIES.get(DEFAULT_NOTE);
type Props = BaseNode<PiezoData, PiezoValueType>;
export const DEFAULT_PIEZO_DATA: Props['data'] = {
	label: 'Piezo',
	duration: 500,
	frequency: DEFAULT_FREQUENCY,
	pin: 11,
	type: 'buzz',
};
