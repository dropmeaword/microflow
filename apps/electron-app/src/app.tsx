import { FigmaProvider, MqttProvider } from "@fhb/mqtt/client";
import { Edge, Node, ReactFlowProvider } from "@xyflow/react";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";
import { useLocalStorage } from "usehooks-ts";
import { ReactFlowComponent } from "./render/components/react-flow/ReactFlowCanvas";
import { useSignalNodesAndEdges } from "./render/hooks/useSignalNodesAndEdges";
import { BoardProvider } from "./render/providers/BoardProvider";
import { useNodesEdgesStore } from "./render/store";

export function App() {
  const [identifier] = useLocalStorage("identifier", uniqueNamesGenerator({ dictionaries: [adjectives, animals] }))

  return (
    <MqttProvider appName="app" uniqueId={identifier}>
      <FigmaProvider>
        <BoardProvider>
          <ReactFlowProvider>
            <NodeAndEdgeSignaler />
            <LoadNodesAndEdges />
            <ReactFlowComponent />
          </ReactFlowProvider>
        </BoardProvider>
      </FigmaProvider>
    </MqttProvider>
  );
}

const root = createRoot(document.body);
root.render(<App />);

function NodeAndEdgeSignaler() {
  useSignalNodesAndEdges()

  return null
}

function LoadNodesAndEdges() {
  const [localNodes] = useLocalStorage<Node[]>("nodes", [])
  const [localEdges] = useLocalStorage<Edge[]>("edges", [])
  const { setNodes, setEdges } = useNodesEdgesStore();


  useEffect(() => {
    setNodes(localNodes);
    setEdges(localEdges);
  }, [setNodes, localNodes, setEdges, localEdges]);

  return null
}
