import { Position } from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { nodeSelector, useNodesEdgesStore } from "../../../store";
import { Handle } from "./Handle";
import { AnimatedNode, NodeContainer, NodeContent, NodeHeader } from "./Node";

export function Counter(props: Props) {
  const { node } = useNodesEdgesStore(
    useShallow(nodeSelector<Props["data"]>(props.id)),
  );

  if (!node) return null;

  return (
    <NodeContainer {...props}>
      <NodeContent>
        <NodeHeader className="text-4xl tabular-nums">
          {node.data.value ?? 0}
        </NodeHeader>
      </NodeContent>
      <Handle
        offset={-0.5}
        type="target"
        position={Position.Top}
        id="increment"
      />
      <Handle
        offset={0.5}
        type="target"
        position={Position.Top}
        id="decrement"
      />
      <Handle type="target" position={Position.Left} id="set" offset={-0.5} />
      <Handle type="target" position={Position.Left} id="reset" offset={0.5} />
      <Handle type="source" position={Position.Right} id="change" />
    </NodeContainer>
  );
}

export type CounterData = {};
type Props = AnimatedNode<CounterData, number>;
