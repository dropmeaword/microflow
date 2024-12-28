import { CalculateData } from '@microflow/components';
import { BaseNode, NodeContainer, useNodeData, useNodeSettings } from './Node';
import { Handle } from './Handle';
import { Position } from '@xyflow/react';
import { useEffect } from 'react';
import { Icons } from '@ui/index';

export function Calculate(props: Props) {
	return (
		<NodeContainer {...props}>
			<Value />
			<Settings />

			<Handle type="target" position={Position.Left} id="1" offset={-0.5} />
			<Handle type="target" position={Position.Left} id="2" offset={0.5} />
			<Handle type="source" position={Position.Right} id="change" />
		</NodeContainer>
	);
}

function Value() {
	const data = useNodeData<CalculateData>();

	switch (data.function) {
		case 'add':
			return <Icons.Plus size={48} className="text-muted-foreground" />;
		case 'subtract':
			return <Icons.Minus size={48} className="text-muted-foreground" />;
		case 'multiply':
			return <Icons.X size={48} className="text-muted-foreground" />;
		case 'divide':
			return <Icons.Divide size={48} className="text-muted-foreground" />;
		case 'modulo':
			return <Icons.Percent size={48} className="text-muted-foreground" />;
		case 'max':
			return <Icons.ArrowUpToLine size={48} className="text-muted-foreground" />;
		case 'min':
			return <Icons.ArrowDownToLine size={48} className="text-muted-foreground" />;
		default:
			return <div>{data.function}</div>;
	}
}

function Settings() {
	const { pane, settings } = useNodeSettings<CalculateData>();

	useEffect(() => {
		if (!pane) return;

		const gateType = pane.addBinding(settings, 'function', {
			index: 0,
			type: 'list',
			options: [
				{ text: 'add', value: 'add' },
				{ text: 'subtract', value: 'subtract' },
				{ text: 'multiply', value: 'multiply' },
				{ text: 'divide', value: 'divide' },
				{ text: 'modulo', value: 'modulo' },
				{ text: 'max', value: 'max' },
				{ text: 'min', value: 'min' },
			],
		});

		return () => {
			gateType.dispose();
		};
	}, [pane, settings]);

	return null;
}

type Props = BaseNode<CalculateData>;
Calculate.defaultProps = {
	data: {
		function: 'add',
		group: 'flow',
		tags: ['transformation', 'control'],
		label: 'Calculate',
	} satisfies Props['data'],
};
