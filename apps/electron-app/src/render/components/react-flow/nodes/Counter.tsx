import type { CounterData, CounterValueType } from '@microflow/components';
import { Position } from '@xyflow/react';
import { Handle } from './Handle';
import { BaseNode, NodeContainer, useNode } from './Node';
import { useNodeValue } from '../../../stores/node-data';

const numberFormat = new Intl.NumberFormat();

export function Counter(props: Props) {
	return (
		<NodeContainer {...props}>
			<Value />
			<Handle type="target" position={Position.Left} id="reset" offset={1.5} />
			<Handle offset={0.5} type="target" position={Position.Left} id="decrement" />
			<Handle offset={-0.5} type="target" position={Position.Left} id="increment" />
			<Handle type="target" position={Position.Left} id="set" offset={-1.5} />
			<Handle type="source" position={Position.Bottom} id="change" />
		</NodeContainer>
	);
}

function Value() {
	const { id } = useNode();
	const value = useNodeValue<CounterValueType>(id, 0);

	return <section className="text-4xl tabular-nums">{numberFormat.format(value)}</section>;
}

type Props = BaseNode<CounterData, CounterValueType>;
export const DEFAULT_COUNTER_DATA: Props['data'] = {
	label: 'Counter',
};
