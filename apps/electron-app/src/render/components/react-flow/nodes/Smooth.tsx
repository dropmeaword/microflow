import type { SmoothData, SmoothValueType } from '@microflow/components';
import { Position } from '@xyflow/react';
import { useEffect } from 'react';
import { Handle } from './Handle';
import { BaseNode, NodeContainer, useNode, useNodeSettingsPane } from './Node';

export function Smooth(props: Props) {
	return (
		<NodeContainer {...props}>
			<Value />
			<Settings />
			<Handle type="target" position={Position.Left} id="signal" offset={-0.5} />
			<Handle type="source" position={Position.Bottom} id="change" />
		</NodeContainer>
	);
}

function Value() {
	const { data } = useNode<SmoothData>();

	return <section className="tabular-nums">{data.attenuation.toFixed(3)}</section>;
}

function Settings() {
	const { pane, settings } = useNodeSettingsPane<SmoothData>();

	useEffect(() => {
		if (!pane) return;

		pane.addBinding(settings, 'attenuation', {
			index: 0,
			min: 0.0,
			max: 1.0,
			step: 0.001,
			label: 'attenuation',
		});
	}, [pane, settings]);

	return null;
}

type Props = BaseNode<SmoothData, SmoothValueType>;
export const DEFAULT_SMOOTH_DATA: Props['data'] = {
	label: 'Smooth',
	attenuation: 0.995,
};
